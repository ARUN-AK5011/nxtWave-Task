-- Drop old indexes that reference assignee_id
DROP INDEX IF EXISTS idx_tasks_assignee;
DROP INDEX IF EXISTS idx_tasks_assignee_status;

-- Remove single assignee from tasks
ALTER TABLE tasks DROP COLUMN IF EXISTS assignee_id;

-- Project date range
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date   TIMESTAMPTZ;

-- Multiple assignees junction table
CREATE TABLE IF NOT EXISTS task_assignees (
    task_id     TEXT NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
    id         TEXT PRIMARY KEY,
    task_id    TEXT NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id),
    content    TEXT NOT NULL CHECK (length(trim(content)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
