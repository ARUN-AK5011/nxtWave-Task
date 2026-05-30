package repository

import (
	"context"
	"task-tracker/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProjectRepo struct {
	db *pgxpool.Pool
}

func NewProjectRepo(db *pgxpool.Pool) *ProjectRepo {
	return &ProjectRepo{db: db}
}

func (r *ProjectRepo) Create(ctx context.Context, p *models.Project) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO projects (id, organization_id, name, description, start_date, end_date, created_by_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at`,
		p.ID, p.OrganizationID, p.Name, p.Description, p.StartDate, p.EndDate, p.CreatedByID,
	).Scan(&p.CreatedAt, &p.UpdatedAt)
}

func (r *ProjectRepo) GetByID(ctx context.Context, id, orgID string) (*models.Project, error) {
	p := &models.Project{}
	err := r.db.QueryRow(ctx, `
		SELECT id, organization_id, name, description, start_date, end_date, created_by_id, created_at, updated_at
		FROM projects WHERE id = $1 AND organization_id = $2`, id, orgID,
	).Scan(&p.ID, &p.OrganizationID, &p.Name, &p.Description, &p.StartDate, &p.EndDate, &p.CreatedByID, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (r *ProjectRepo) ListByOrg(ctx context.Context, orgID string) ([]*models.Project, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, organization_id, name, description, start_date, end_date, created_by_id, created_at, updated_at
		FROM projects WHERE organization_id = $1 ORDER BY created_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*models.Project
	for rows.Next() {
		p := &models.Project{}
		if err := rows.Scan(&p.ID, &p.OrganizationID, &p.Name, &p.Description, &p.StartDate, &p.EndDate, &p.CreatedByID, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (r *ProjectRepo) Delete(ctx context.Context, id, orgID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM projects WHERE id=$1 AND organization_id=$2`, id, orgID)
	return err
}
