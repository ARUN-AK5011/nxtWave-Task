package repository

import (
	"context"
	"fmt"
	"strings"
	"task-tracker/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TaskRepo struct {
	db *pgxpool.Pool
}

func NewTaskRepo(db *pgxpool.Pool) *TaskRepo {
	return &TaskRepo{db: db}
}

type TaskFilter struct {
	Status     string
	Priority   string
	AssigneeID string
	Page       int
	Limit      int
}

func (r *TaskRepo) Create(ctx context.Context, t *models.Task) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO tasks (id, organization_id, project_id, title, description, priority, status, assignee_id, created_by_id, due_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at`,
		t.ID, t.OrganizationID, t.ProjectID, t.Title, t.Description,
		t.Priority, t.Status, t.AssigneeID, t.CreatedByID, t.DueDate,
	).Scan(&t.CreatedAt, &t.UpdatedAt)
}

func (r *TaskRepo) GetByID(ctx context.Context, id, orgID string) (*models.TaskWithAssignee, error) {
	t := &models.TaskWithAssignee{}
	err := r.db.QueryRow(ctx, `
		SELECT t.id, t.organization_id, t.project_id, t.title, t.description,
		       t.priority, t.status, t.assignee_id, t.created_by_id, t.due_date,
		       t.completed_at, t.created_at, t.updated_at,
		       u.name AS assignee_name, u.email AS assignee_email
		FROM tasks t
		LEFT JOIN users u ON u.id = t.assignee_id
		WHERE t.id = $1 AND t.organization_id = $2`, id, orgID,
	).Scan(
		&t.ID, &t.OrganizationID, &t.ProjectID, &t.Title, &t.Description,
		&t.Priority, &t.Status, &t.AssigneeID, &t.CreatedByID, &t.DueDate,
		&t.CompletedAt, &t.CreatedAt, &t.UpdatedAt,
		&t.AssigneeName, &t.AssigneeEmail,
	)
	return t, err
}

func (r *TaskRepo) List(ctx context.Context, orgID string, f TaskFilter) ([]*models.TaskWithAssignee, int, error) {
	where := []string{"t.organization_id = $1"}
	args := []any{orgID}
	idx := 2

	if f.Status != "" {
		where = append(where, fmt.Sprintf("t.status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.Priority != "" {
		where = append(where, fmt.Sprintf("t.priority = $%d", idx))
		args = append(args, f.Priority)
		idx++
	}
	if f.AssigneeID != "" {
		where = append(where, fmt.Sprintf("t.assignee_id = $%d", idx))
		args = append(args, f.AssigneeID)
		idx++
	}

	whereClause := "WHERE " + strings.Join(where, " AND ")

	var total int
	if err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM tasks t "+whereClause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (f.Page - 1) * f.Limit
	query := fmt.Sprintf(`
		SELECT t.id, t.organization_id, t.project_id, t.title, t.description,
		       t.priority, t.status, t.assignee_id, t.created_by_id, t.due_date,
		       t.completed_at, t.created_at, t.updated_at,
		       u.name AS assignee_name, u.email AS assignee_email
		FROM tasks t
		LEFT JOIN users u ON u.id = t.assignee_id
		%s ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d`, whereClause, idx, idx+1)

	args = append(args, f.Limit, offset)
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []*models.TaskWithAssignee
	for rows.Next() {
		t := &models.TaskWithAssignee{}
		if err := rows.Scan(
			&t.ID, &t.OrganizationID, &t.ProjectID, &t.Title, &t.Description,
			&t.Priority, &t.Status, &t.AssigneeID, &t.CreatedByID, &t.DueDate,
			&t.CompletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.AssigneeName, &t.AssigneeEmail,
		); err != nil {
			return nil, 0, err
		}
		tasks = append(tasks, t)
	}
	return tasks, total, rows.Err()
}

func (r *TaskRepo) Update(ctx context.Context, t *models.Task) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tasks SET title=$1, description=$2, priority=$3, assignee_id=$4,
		                 due_date=$5, updated_at=NOW()
		WHERE id=$6 AND organization_id=$7`,
		t.Title, t.Description, t.Priority, t.AssigneeID, t.DueDate, t.ID, t.OrganizationID)
	return err
}

func (r *TaskRepo) UpdateStatus(ctx context.Context, id, orgID string, status models.Status) error {
	var completedAt any
	if status == models.StatusDone {
		completedAt = "NOW()"
	}
	_ = completedAt
	_, err := r.db.Exec(ctx, `
		UPDATE tasks SET status=$1, updated_at=NOW(),
		                 completed_at = CASE WHEN $1 = 'DONE' THEN NOW() ELSE completed_at END
		WHERE id=$2 AND organization_id=$3`, status, id, orgID)
	return err
}

func (r *TaskRepo) Delete(ctx context.Context, id, orgID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM tasks WHERE id=$1 AND organization_id=$2`, id, orgID)
	return err
}
