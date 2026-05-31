package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
	maxMsgSize = 512
)

type Client struct {
	UserID string
	OrgID  string
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
}

func NewClient(userID, orgID string, hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		UserID: userID,
		OrgID:  orgID,
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, 64),
	}
}

// SendMsg queues a typed message to this client.
func (c *Client) SendMsg(msg OutMsg) {
	data, _ := json.Marshal(msg)
	select {
	case c.send <- data:
	default:
	}
}

// WritePump pumps messages from the send channel to the WebSocket.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ReadPump keeps the connection alive and handles client disconnection.
func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
		log.Printf("ws: user %s disconnected", c.UserID)
	}()

	c.conn.SetReadLimit(maxMsgSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}
