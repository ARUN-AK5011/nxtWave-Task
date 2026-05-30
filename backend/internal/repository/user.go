package repository

import (
	"context"
	"task-tracker/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(ctx context.Context, u *models.User) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO users (id, organization_id, name, email, password_hash, role)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at`,
		u.ID, u.OrganizationID, u.Name, u.Email, u.PasswordHash, u.Role,
	).Scan(&u.CreatedAt, &u.UpdatedAt)
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, organization_id, name, email, password_hash, role, created_at, updated_at
		FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.OrganizationID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx, `
		SELECT id, organization_id, name, email, password_hash, role, created_at, updated_at
		FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.OrganizationID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (r *UserRepo) ListByOrg(ctx context.Context, orgID string) ([]*models.User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, organization_id, name, email, role, created_at, updated_at
		FROM users WHERE organization_id = $1 ORDER BY name`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		u := &models.User{}
		if err := rows.Scan(&u.ID, &u.OrganizationID, &u.Name, &u.Email, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *UserRepo) UpdateRole(ctx context.Context, userID string, role models.Role) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, role, userID)
	return err
}

func (r *UserRepo) CreateOrg(ctx context.Context, org *models.Organization) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO organizations (id, name) VALUES ($1, $2) RETURNING created_at`,
		org.ID, org.Name,
	).Scan(&org.CreatedAt)
}

func (r *UserRepo) GetOrgByID(ctx context.Context, id string) (*models.Organization, error) {
	org := &models.Organization{}
	err := r.db.QueryRow(ctx, `
		SELECT id, name, created_at FROM organizations WHERE id = $1`, id,
	).Scan(&org.ID, &org.Name, &org.CreatedAt)
	return org, err
}
