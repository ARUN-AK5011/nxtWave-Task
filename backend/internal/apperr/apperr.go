package apperr

import "fmt"

type AppError struct {
	Status  int    `json:"status"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func New(status int, code, message string) *AppError {
	return &AppError{Status: status, Code: code, Message: message}
}

func NotFound(resource string) *AppError {
	return New(404, "NOT_FOUND", resource+" not found")
}

func Forbidden() *AppError {
	return New(403, "FORBIDDEN", "access denied")
}

func Validation(message string) *AppError {
	return New(400, "VALIDATION_ERROR", message)
}

func Internal() *AppError {
	return New(500, "INTERNAL_ERROR", "an unexpected error occurred")
}

func Conflict(message string) *AppError {
	return New(409, "CONFLICT", message)
}
