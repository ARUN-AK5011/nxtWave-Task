package handlers

import (
	"net/http"
	"strconv"
	"task-tracker/internal/apperr"
	"task-tracker/internal/repository"
	"task-tracker/internal/services"

	"github.com/gin-gonic/gin"
)

type TaskHandler struct {
	svc *services.TaskService
}

func NewTaskHandler(svc *services.TaskService) *TaskHandler {
	return &TaskHandler{svc: svc}
}

func (h *TaskHandler) Create(c *gin.Context) {
	var in services.CreateTaskInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	task, err := h.svc.Create(c.Request.Context(), currentOrgID(c), currentUserID(c), in)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, task)
}

func (h *TaskHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	f := repository.TaskFilter{
		Status:     c.Query("status"),
		Priority:   c.Query("priority"),
		AssigneeID: c.Query("assignee_id"),
		Page:       page,
		Limit:      limit,
	}

	tasks, total, err := h.svc.List(c.Request.Context(), currentOrgID(c), f, currentUserID(c), currentRole(c))
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":  tasks,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *TaskHandler) GetByID(c *gin.Context) {
	task, err := h.svc.GetByID(c.Request.Context(), c.Param("id"), currentOrgID(c))
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) Update(c *gin.Context) {
	var in services.UpdateTaskInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	task, err := h.svc.Update(c.Request.Context(), c.Param("id"), currentOrgID(c), in)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) UpdateStatus(c *gin.Context) {
	var in services.UpdateStatusInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, apperr.Validation(err.Error()))
		return
	}
	task, err := h.svc.UpdateStatus(c.Request.Context(), c.Param("id"), currentOrgID(c), currentUserID(c), currentRole(c), in)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusOK, task)
}

func (h *TaskHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id"), currentOrgID(c)); err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
