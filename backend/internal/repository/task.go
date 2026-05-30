package repository

import (
	"context"
	"fmt"
	"strings"
	"task-tracker/internal/models"

	"github.com/jackc/pgx/v5"
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

// fetchAssigneesForTasks fetches assignees for a list of task IDs and returns
// a map of taskID -> []UserBasic.
func (r *TaskRepo) fetchAssigneesForTasks(ctx context.Context, taskIDs []string) (map[string][]models.UserBasic, error) {
	if len(taskIDs) == 0 {
		return map[string][]models.UserBasic{}, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT ta.task_id, u.id, u.name, u.email, u.role
		FROM task_assignees ta
		JOIN users u ON u.id = ta.user_id
		WHERE ta.task_id = ANY($1::text[])
		ORDER BY ta.assigned_at`, taskIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]models.UserBasic)
	for rows.Next() {
		var taskID string
		var ub models.UserBasic
		if err := rows.Scan(&taskID, &ub.ID, &ub.Name, &ub.Email, &ub.Role); err != nil {
			return nil, err
		}
		result[taskID] = append(result[taskID], ub)
	}
	return result, rows.Err()
}

func (r *TaskRepo) Create(ctx context.Context, t *models.Task, assigneeIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if err := tx.QueryRow(ctx, `
		INSERT INTO tasks (id, organization_id, project_id, title, description, priority, status, created_by_id, due_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at`,
		t.ID, t.OrganizationID, t.ProjectID, t.Title, t.Description,
		t.Priority, t.Status, t.CreatedByID, t.DueDate,
	).Scan(&t.CreatedAt, &t.UpdatedAt); err != nil {
		return err
	}

	if err := insertAssignees(ctx, tx, t.ID, assigneeIDs); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *TaskRepo) GetByID(ctx context.Context, id, orgID string) (*models.Task, error) {
	t := &models.Task{}
	err := r.db.QueryRow(ctx, `
		SELECT id, organization_id, project_id, title, description,
		       priority, status, created_by_id, due_date,
		       completed_at, created_at, updated_at
		FROM tasks
		WHERE id = $1 AND organization_id = $2`, id, orgID,
	).Scan(
		&t.ID, &t.OrganizationID, &t.ProjectID, &t.Title, &t.Description,
		&t.Priority, &t.Status, &t.CreatedByID, &t.DueDate,
		&t.CompletedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	assigneeMap, err := r.fetchAssigneesForTasks(ctx, []string{t.ID})
	if err != nil {
		return nil, err
	}
	if assignees, ok := assigneeMap[t.ID]; ok {
		t.Assignees = assignees
	} else {
		t.Assignees = []models.UserBasic{}
	}
	return t, nil
}

func (r *TaskRepo) List(ctx context.Context, orgID string, f TaskFilter) ([]*models.Task, int, error) {
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
		where = append(where, fmt.Sprintf("t.id IN (SELECT task_id FROM task_assignees WHERE user_id = $%d)", idx))
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
		       t.priority, t.status, t.created_by_id, t.due_date,
		       t.completed_at, t.created_at, t.updated_at
		FROM tasks t
		%s ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d`, whereClause, idx, idx+1)

	args = append(args, f.Limit, offset)
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tasks []*models.Task
	var taskIDs []string
	for rows.Next() {
		t := &models.Task{}
		if err := rows.Scan(
			&t.ID, &t.OrganizationID, &t.ProjectID, &t.Title, &t.Description,
			&t.Priority, &t.Status, &t.CreatedByID, &t.DueDate,
			&t.CompletedAt, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		t.Assignees = []models.UserBasic{}
		tasks = append(tasks, t)
		taskIDs = append(taskIDs, t.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	assigneeMap, err := r.fetchAssigneesForTasks(ctx, taskIDs)
	if err != nil {
		return nil, 0, err
	}
	for _, t := range tasks {
		if assignees, ok := assigneeMap[t.ID]; ok {
			t.Assignees = assignees
		}
	}

	return tasks, total, nil
}

func (r *TaskRepo) Update(ctx context.Context, t *models.Task, newAssigneeIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err := tx.Exec(ctx, `
		UPDATE tasks SET title=$1, description=$2, priority=$3,
		                 due_date=$4, updated_at=NOW()
		WHERE id=$5 AND organization_id=$6`,
		t.Title, t.Description, t.Priority, t.DueDate, t.ID, t.OrganizationID,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `DELETE FROM task_assignees WHERE task_id = $1`, t.ID); err != nil {
		return err
	}

	if err := insertAssignees(ctx, tx, t.ID, newAssigneeIDs); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *TaskRepo) UpdateStatus(ctx context.Context, id, orgID string, status models.Status) error {
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

func (r *TaskRepo) IsAssignee(ctx context.Context, taskID, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2)`,
		taskID, userID,
	).Scan(&exists)
	return exists, err
}

func (r *TaskRepo) GetAssigneeIDs(ctx context.Context, taskID string) ([]string, error) {
	rows, err := r.db.Query(ctx, `SELECT user_id FROM task_assignees WHERE task_id = $1`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// insertAssignees batch-inserts rows into task_assignees within a transaction.
func insertAssignees(ctx context.Context, tx pgx.Tx, taskID string, userIDs []string) error {
	for _, uid := range userIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			taskID, uid,
		); err != nil {
			return err
		}
	}
	return nil
}
