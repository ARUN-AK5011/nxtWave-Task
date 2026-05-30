package services

import (
	"context"
	"net/http"
	"task-tracker/internal/apperr"
	"task-tracker/internal/cache"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type TaskService struct {
	taskRepo *repository.TaskRepo
	cache    *cache.Cache
}

func NewTaskService(taskRepo *repository.TaskRepo, cache *cache.Cache) *TaskService {
	return &TaskService{taskRepo: taskRepo, cache: cache}
}

type CreateTaskInput struct {
	ProjectID   string     `json:"project_id" binding:"required"`
	Title       string     `json:"title" binding:"required,min=1,max=255"`
	Description string     `json:"description"`
	Priority    string     `json:"priority" binding:"required,oneof=LOW MEDIUM HIGH"`
	AssigneeID  *string    `json:"assignee_id"`
	DueDate     *time.Time `json:"due_date"`
}

type UpdateTaskInput struct {
	Title       string     `json:"title" binding:"omitempty,min=1,max=255"`
	Description string     `json:"description"`
	Priority    string     `json:"priority" binding:"omitempty,oneof=LOW MEDIUM HIGH"`
	AssigneeID  *string    `json:"assignee_id"`
	DueDate     *time.Time `json:"due_date"`
}

type UpdateStatusInput struct {
	Status string `json:"status" binding:"required,oneof=TODO IN_PROGRESS IN_REVIEW DONE BLOCKED"`
}

func (s *TaskService) Create(ctx context.Context, orgID, createdByID string, in CreateTaskInput) (*models.Task, error) {
	if in.DueDate != nil && in.DueDate.Before(time.Now()) {
		return nil, apperr.Validation("due_date must be a future date")
	}
	task := &models.Task{
		ID:             uuid.NewString(),
		OrganizationID: orgID,
		ProjectID:      in.ProjectID,
		Title:          in.Title,
		Description:    in.Description,
		Priority:       models.Priority(in.Priority),
		Status:         models.StatusTodo,
		AssigneeID:     in.AssigneeID,
		CreatedByID:    createdByID,
		DueDate:        in.DueDate,
	}
	if err := s.taskRepo.Create(ctx, task); err != nil {
		return nil, apperr.Internal()
	}
	s.invalidateAssigneeCache(ctx, in.AssigneeID)
	return task, nil
}

func (s *TaskService) List(ctx context.Context, orgID string, f repository.TaskFilter, userID string, role models.Role) ([]*models.TaskWithAssignee, int, error) {
	if role == models.RoleMember {
		f.AssigneeID = userID
	}

	if f.AssigneeID != "" && role != models.RoleMember {
		cacheKey := cache.TaskListKey(f.AssigneeID, f.Status, f.Priority, f.Page, f.Limit)
		var cached []*models.TaskWithAssignee
		if err := s.cache.Get(ctx, cacheKey, &cached); err == nil {
			return cached, -1, nil
		}
	}

	tasks, total, err := s.taskRepo.List(ctx, orgID, f)
	if err != nil {
		return nil, 0, apperr.Internal()
	}

	if f.AssigneeID != "" {
		cacheKey := cache.TaskListKey(f.AssigneeID, f.Status, f.Priority, f.Page, f.Limit)
		_ = s.cache.Set(ctx, cacheKey, tasks, 5*time.Minute)
	}

	return tasks, total, nil
}

func (s *TaskService) GetByID(ctx context.Context, id, orgID string) (*models.TaskWithAssignee, error) {
	task, err := s.taskRepo.GetByID(ctx, id, orgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperr.NotFound("task")
		}
		return nil, apperr.Internal()
	}
	return task, nil
}

func (s *TaskService) Update(ctx context.Context, id, orgID string, in UpdateTaskInput) (*models.TaskWithAssignee, error) {
	task, err := s.taskRepo.GetByID(ctx, id, orgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperr.NotFound("task")
		}
		return nil, apperr.Internal()
	}
	if in.DueDate != nil && in.DueDate.Before(time.Now()) {
		return nil, apperr.Validation("due_date must be a future date")
	}
	if in.Title != "" {
		task.Title = in.Title
	}
	task.Description = in.Description
	if in.Priority != "" {
		task.Priority = models.Priority(in.Priority)
	}
	oldAssignee := task.AssigneeID
	task.AssigneeID = in.AssigneeID
	task.DueDate = in.DueDate

	if err := s.taskRepo.Update(ctx, &task.Task); err != nil {
		return nil, apperr.Internal()
	}
	s.invalidateAssigneeCache(ctx, oldAssignee)
	s.invalidateAssigneeCache(ctx, in.AssigneeID)
	return task, nil
}

func (s *TaskService) UpdateStatus(ctx context.Context, id, orgID, requestorID string, role models.Role, in UpdateStatusInput) (*models.TaskWithAssignee, error) {
	task, err := s.taskRepo.GetByID(ctx, id, orgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperr.NotFound("task")
		}
		return nil, apperr.Internal()
	}

	isAssignee := task.AssigneeID != nil && *task.AssigneeID == requestorID
	if role == models.RoleMember && !isAssignee {
		return nil, apperr.New(http.StatusForbidden, "FORBIDDEN", "only the assignee or a manager can update task status")
	}

	newStatus := models.Status(in.Status)
	if !task.Status.CanTransitionTo(newStatus) {
		return nil, apperr.Validation("invalid status transition from " + string(task.Status) + " to " + string(newStatus))
	}

	if err := s.taskRepo.UpdateStatus(ctx, id, orgID, newStatus); err != nil {
		return nil, apperr.Internal()
	}
	s.invalidateAssigneeCache(ctx, task.AssigneeID)
	task.Status = newStatus
	return task, nil
}

func (s *TaskService) Delete(ctx context.Context, id, orgID string) error {
	task, err := s.taskRepo.GetByID(ctx, id, orgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperr.NotFound("task")
		}
		return apperr.Internal()
	}
	if err := s.taskRepo.Delete(ctx, id, orgID); err != nil {
		return apperr.Internal()
	}
	s.invalidateAssigneeCache(ctx, task.AssigneeID)
	return nil
}

func (s *TaskService) invalidateAssigneeCache(ctx context.Context, assigneeID *string) {
	if assigneeID == nil {
		return
	}
	_ = s.cache.DelPattern(ctx, cache.TaskListPattern(*assigneeID))
}
