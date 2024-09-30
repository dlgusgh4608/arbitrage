export interface UserSchema {
  id: number
  name: string
  email: string
  password: string
  salt: string
  user_role_id: number
  selected_user_env_id: number
  created_at: Date
  updated_at: Date
}