export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

export interface User {
  id: string
  organization_id: string
  name: string
  email: string
  role: Role
  created_at: string
}

export interface Organization {
  id: string
  name: string
}

export interface Project {
  id: string
  organization_id: string
  name: string
  description: string
  created_by_id: string
  created_at: string
}

export interface Task {
  id: string
  organization_id: string
  project_id: string
  title: string
  description: string
  priority: Priority
  status: TaskStatus
  assignee_id: string | null
  assignee_name: string | null
  assignee_email: string | null
  created_by_id: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}
