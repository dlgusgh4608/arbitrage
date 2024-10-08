import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

interface UserRoleSchema {
  id: number
  role: 'god' | 'vip' | 'normal'
}

class UserRole extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    find: function() {
      const query = 'SELECT * FROM user_roles;'
      return { query }
    }
  }

  Exec = {
    find: async (): Promise<UserRoleSchema[]> => {
      const { query } = this.Query.find()

      try {
        const result = await pool.query<UserRoleSchema>(query)

        return result.rows
      } catch (error) {
        throw error
      }
    }
  }
}

export type { UserRoleSchema }
export default new UserRole()