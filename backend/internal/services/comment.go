package services

import (
	"context"
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type AddCommentInput struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}

type CommentService struct {
	commentRepo *repository.CommentRepo
	taskRepo    *repository.TaskRepo
}

func NewCommentService(commentRepo *repository.CommentRepo, taskRepo *repository.TaskRepo) *CommentService {
	return &CommentService{commentRepo: commentRepo, taskRepo: taskRepo}
}

// Add creates a comment on a task. MEMBERs must be assignees of the task.
func (s *CommentService) Add(ctx context.Context, taskID, orgID, userID string, role models.Role, in AddCommentInput) (*models.TaskComment, error) {
	// Verify task exists and belongs to the org.
	_, err := s.taskRepo.GetByID(ctx, taskID, orgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperr.NotFound("task")
		}
		return nil, apperr.Internal()
	}

	// Members may only comment if they are an assignee.
	if role == models.RoleMember {
		isAssignee, err := s.taskRepo.IsAssignee(ctx, taskID, userID)
		if err != nil {
			return nil, apperr.Internal()
		}
		if !isAssignee {
			return nil, apperr.New(http.StatusForbidden, "FORBIDDEN", "only assignees, managers, or admins can comment on this task")
		}
	}

	comment := &models.TaskComment{
		ID:      uuid.NewString(),
		TaskID:  taskID,
		UserID:  userID,
		Content: in.Content,
	}
	if err := s.commentRepo.Create(ctx, comment); err != nil {
		return nil, apperr.Internal()
	}
	return comment, nil
}

// List returns all comments for a task, verifying org membership via the repo.
func (s *CommentService) List(ctx context.Context, taskID, orgID string) ([]*models.TaskComment, error) {
	comments, err := s.commentRepo.ListByTask(ctx, taskID, orgID)
	if err != nil {
		return nil, apperr.Internal()
	}
	return comments, nil
}
