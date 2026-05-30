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

// validTransitions defines allowed status moves
var validTransitions = map[Status][]Status{
	StatusTodo:       {StatusInProgress, StatusBlocked},
	StatusInProgress: {StatusInReview, StatusBlocked},
	StatusInReview:   {StatusDone, StatusBlocked},
	StatusBlocked:    {StatusInProgress},
	StatusDone:       {},
}

func (s Status) CanTransitionTo(next Status) bool {
	allowed, ok := validTransitions[s]
	if !ok {
		return false
	}
	for _, a := range allowed {
		if a == next {
			return true
		}
	}
	return false
}

type Task struct {
	ID             string    `json:"id" db:"id"`
	OrganizationID string    `json:"organization_id" db:"organization_id"`
	ProjectID      string    `json:"project_id" db:"project_id"`
	Title          string    `json:"title" db:"title"`
	Description    string    `json:"description" db:"description"`
	Priority       Priority  `json:"priority" db:"priority"`
	Status         Status    `json:"status" db:"status"`
	AssigneeID     *string   `json:"assignee_id" db:"assignee_id"`
	CreatedByID    string    `json:"created_by_id" db:"created_by_id"`
	DueDate        *time.Time `json:"due_date" db:"due_date"`
	CompletedAt    *time.Time `json:"completed_at" db:"completed_at"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type TaskWithAssignee struct {
	Task
	AssigneeName  *string `json:"assignee_name" db:"assignee_name"`
	AssigneeEmail *string `json:"assignee_email" db:"assignee_email"`
}

type Project struct {
	ID             string    `json:"id" db:"id"`
	OrganizationID string    `json:"organization_id" db:"organization_id"`
	Name           string    `json:"name" db:"name"`
	Description    string    `json:"description" db:"description"`
	CreatedByID    string    `json:"created_by_id" db:"created_by_id"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
