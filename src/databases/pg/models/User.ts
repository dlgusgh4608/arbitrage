import { pool } from '@databases/pg'
import { generateHashPassword, comparePassword } from '@utils/crypto'

interface UserSchema {
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

interface CreateUserPayload {
  email: string
  name: string
  password: string
  user_role_id?: number
}

const User = {
  create: async (payload: CreateUserPayload): Promise<void> => {
    if(!payload.email) throw new Error('email is required')
    if(!payload.name) throw new Error('name is required')
    if(!payload.password) throw new Error('password is required')
    
    const client = await pool.connect()
    try {
      const {
        email,
        name,
        password,
        user_role_id,
      } = payload

      const userRoleId = user_role_id || 3

      const { salt, hashedPassword } = generateHashPassword(password!)

      await client.query(
        `
        INSERT INTO users (name, email, password, salt, user_role_id)
        VALUES ($1, $2, $3, $4, $5);
        `,
        [name, email, hashedPassword, salt, userRoleId]
      )
    } catch (error) {
      throw error
    } finally {
      await client.release()
    }
  },
  findByEmail: async (email: string): Promise<UserSchema | null> => {
    if(!email) throw new Error('email is required')
    
    const client = await pool.connect()
    try {
      const result = await client.query<UserSchema>(
        'SELECT * FROM users WHERE email = $1;',
        [email]
      )
      
      const row = result.rows[0]

      return row || null
    } catch (error) {
      throw error
    } finally {
      await client.release()
    }
  }
}

export type { UserSchema, CreateUserPayload }
export default User