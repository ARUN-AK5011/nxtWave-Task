package repository

import (
	"context"
	"task-tracker/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CommentRepo struct {
	db *pgxpool.Pool
}

func NewCommentRepo(db *pgxpool.Pool) *CommentRepo {
	return &CommentRepo{db: db}
}

func (r *CommentRepo) Create(ctx context.Context, c *models.TaskComment) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO task_comments (id, task_id, user_id, content)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at`,
		c.ID, c.TaskID, c.UserID, c.Content,
	).Scan(&c.CreatedAt)
}

// ListByTask returns all comments for a task, verifying the task belongs to orgID.
func (r *CommentRepo) ListByTask(ctx context.Context, taskID, orgID string) ([]*models.TaskComment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT tc.id, tc.task_id, tc.user_id, u.name, u.role, tc.content, tc.created_at
		FROM task_comments tc
		JOIN users u ON u.id = tc.user_id
		JOIN tasks t ON t.id = tc.task_id
		WHERE tc.task_id = $1 AND t.organization_id = $2
		ORDER BY tc.created_at ASC`, taskID, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*models.TaskComment
	for rows.Next() {
		c := &models.TaskComment{}
		if err := rows.Scan(&c.ID, &c.TaskID, &c.UserID, &c.UserName, &c.UserRole, &c.Content, &c.CreatedAt); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}
