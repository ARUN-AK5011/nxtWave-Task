export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

export interface UserBasic {
  id: string
  name: string
  email: string
  role: Role
}

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
  start_date: string | null
  end_date: string | null
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
  assignees: UserBasic[]
  created_by_id: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  user_role: Role
  content: string
  created_at: string
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
