import { pool } from '@databases/pg'

interface UserRoleSchema {
  id: number
  role: 'god' | 'vip' | 'normal'
}

const UserRole = {
  getAll: async (): Promise<UserRoleSchema[]> => {
    const client = await pool.connect()
    try {
      const query = 'SELECT * FROM user_roles;'
      const result = await client.query<UserRoleSchema>(query)
      return result.rows
    } catch (error) {
      throw error
    } finally {
      await client.release()
    }
  }
}

export type { UserRoleSchema }
export default UserRole