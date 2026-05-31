package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MsgType string

const (
	MsgOverdue   MsgType = "OVERDUE_ALERT"
	MsgConnected MsgType = "CONNECTED"
)

type OutMsg struct {
	Type      MsgType `json:"type"`
	TaskID    string  `json:"task_id,omitempty"`
	TaskTitle string  `json:"task_title,omitempty"`
	DueDate   string  `json:"due_date,omitempty"`
}

// sentKey prevents spamming the same notification repeatedly.
type sentKey struct{ taskID, userID string }

type Hub struct {
	mu      sync.RWMutex
	clients map[string][]*Client // userID → open connections (multiple tabs)
	sent    map[sentKey]time.Time
	db      *pgxpool.Pool
}

func NewHub(db *pgxpool.Pool) *Hub {
	return &Hub{
		clients: make(map[string][]*Client),
		sent:    make(map[sentKey]time.Time),
		db:      db,
	}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[c.UserID] = append(h.clients[c.UserID], c)
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	list := h.clients[c.UserID]
	for i, cl := range list {
		if cl == c {
			h.clients[c.UserID] = append(list[:i], list[i+1:]...)
			break
		}
	}
	if len(h.clients[c.UserID]) == 0 {
		delete(h.clients, c.UserID)
	}
}

func (h *Hub) SendToUser(userID string, msg OutMsg) {
	data, _ := json.Marshal(msg)
	h.mu.RLock()
	clients := h.clients[userID]
	h.mu.RUnlock()
	for _, c := range clients {
		select {
		case c.send <- data:
		default:
			// slow/dead client — skip
		}
	}
}

// StartOverdueChecker runs immediately then every minute, notifying connected
// users about their overdue tasks.
func (h *Hub) StartOverdueChecker(ctx context.Context) {
	h.checkOverdue(ctx)
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			h.checkOverdue(ctx)
		case <-ctx.Done():
			return
		}
	}
}

func (h *Hub) checkOverdue(ctx context.Context) {
	// Notify assignees + all admins/managers in the same org.
	rows, err := h.db.Query(ctx, `
		SELECT t.id, t.title, t.due_date, ta.user_id
		FROM tasks t
		JOIN task_assignees ta ON ta.task_id = t.id
		WHERE t.due_date < NOW()
		  AND t.status NOT IN ('DONE', 'BLOCKED')

		UNION

		SELECT DISTINCT t.id, t.title, t.due_date, u.id
		FROM tasks t
		JOIN users u ON u.organization_id = t.organization_id
		             AND u.role IN ('ADMIN', 'MANAGER')
		WHERE t.due_date < NOW()
		  AND t.status NOT IN ('DONE', 'BLOCKED')

		ORDER BY due_date ASC
	`)
	if err != nil {
		log.Printf("overdue check query error: %v", err)
		return
	}
	defer rows.Close()

	now := time.Now()
	cooldown := time.Hour // re-notify every hour at most

	for rows.Next() {
		var (
			taskID, title, userID string
			dueDate               time.Time
		)
		if err := rows.Scan(&taskID, &title, &dueDate, &userID); err != nil {
			continue
		}

		// Skip if recently notified.
		key := sentKey{taskID, userID}
		h.mu.RLock()
		last, alreadySent := h.sent[key]
		_, connected := h.clients[userID]
		h.mu.RUnlock()

		if !connected {
			continue
		}
		if alreadySent && now.Sub(last) < cooldown {
			continue
		}

		h.SendToUser(userID, OutMsg{
			Type:      MsgOverdue,
			TaskID:    taskID,
			TaskTitle: title,
			DueDate:   dueDate.Format(time.RFC3339),
		})

		h.mu.Lock()
		h.sent[key] = now
		h.mu.Unlock()
	}

	// Prune old sent entries to prevent memory leak.
	h.mu.Lock()
	for k, t := range h.sent {
		if now.Sub(t) > 24*time.Hour {
			delete(h.sent, k)
		}
	}
	h.mu.Unlock()
}
