package models

import "time"

type Priority string
type Status string

const (
	PriorityLow    Priority = "LOW"
	PriorityMedium Priority = "MEDIUM"
	PriorityHigh   Priority = "HIGH"

	StatusTodo       Status = "TODO"
	StatusInProgress Status = "IN_PROGRESS"
	StatusInReview   Status = "IN_REVIEW"
	StatusDone       Status = "DONE"
	StatusBlocked    Status = "BLOCKED"
)

var validTransitions = map[Status][]Status{
	StatusTodo:       {StatusInProgress, StatusBlocked},
	StatusInProgress: {StatusInReview, StatusBlocked},
	StatusInReview:   {StatusDone, StatusBlocked},
	StatusBlocked:    {StatusInProgress},
	StatusDone:       {},
}

func (s Status) CanTransitionTo(next Status) bool {
	for _, a := range validTransitions[s] {
		if a == next {
			return true
		}
	}
	return false
}

type Task struct {
	ID             string      `json:"id"`
	OrganizationID string      `json:"organization_id"`
	ProjectID      string      `json:"project_id"`
	Title          string      `json:"title"`
	Description    string      `json:"description"`
	Priority       Priority    `json:"priority"`
	Status         Status      `json:"status"`
	Assignees      []UserBasic `json:"assignees"`
	CreatedByID    string      `json:"created_by_id"`
	DueDate        *time.Time  `json:"due_date"`
	CompletedAt    *time.Time  `json:"completed_at"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type TaskComment struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	UserID    string    `json:"user_id"`
	UserName  string    `json:"user_name"`
	UserRole  Role      `json:"user_role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type Project struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	Name           string     `json:"name"`
	Description    string     `json:"description"`
	StartDate      *time.Time `json:"start_date"`
	EndDate        *time.Time `json:"end_date"`
	CreatedByID    string     `json:"created_by_id"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
