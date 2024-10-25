import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'
import { generateHashPassword, decrypt, encrypt } from '@utils/crypto'

interface UserSchema {
  id: number
  name: string
  email: string
  password: string
  salt: string
  user_role_id: number
  telegram_id: string | null
  telegram_iv: string | null
  created_at: Date
  updated_at: Date
}

interface CreateUserPayload {
  email: string
  name: string
  password: string
  user_role_id?: number
}

interface IOriginUserEnv {
  domestic_access_key: string
  domestic_access_iv: string
  domestic_secret_key: string
  domestic_secret_iv: string
  overseas_access_key: string
  overseas_access_iv: string
  overseas_secret_key: string
  overseas_secret_iv: string
}

interface IUserEnv {
  domestic_access_key: string
  domestic_secret_key: string
  overseas_access_key: string
  overseas_secret_key: string
}

interface IOriginUserTradeWithEnv {
  user_id: number
  symbol_id: number
  telegram_id?: string
  telegram_iv?: string
  user_env: IOriginUserEnv
}

interface IUserTradeWithEnv {
  user_id: number
  symbol_id: number
  telegram_id?: string | null
  user_env: IUserEnv
}

interface IUpdateTelId {
  user_id: number
  telegram_id: string
}


class User extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    create: function(payload: CreateUserPayload) {
      if(!payload.email) throw new Error('email is required')
      if(!payload.name) throw new Error('name is required')
      if(!payload.password) throw new Error('password is required')
      
      const userRoleId = payload.user_role_id || 3

      const { salt, hashedPassword } = generateHashPassword(payload.password)

      const query =
      `
      INSERT INTO users (name, email, password, salt, user_role_id)
      VALUES ($1, $2, $3, $4, $5);
      `

      const queryValues = [payload.name, payload.email, hashedPassword, salt, userRoleId]
      
      return { query, queryValues }
    },
    findByEmail: function(email: string) {
      if(!email) throw new Error('email is required')

      const query =
      `
      SELECT * FROM users WHERE email = $1;
      `
      
      return { query, queryValues: [email] }
    },
    findById: function(id: number) {
      if(!id) throw new Error('id is required')

      const query =
      `
      SELECT * FROM users WHERE id = $1;
      `

      return { query, queryValues: [id] }
    },
    findWithEnv: function() {
      const query = 
      `
      SELECT
        u.id AS user_id,
        us.trade_symbol_id as symbol_id,
        u.telegram_id AS telegram_id,
        u.telegram_iv AS telegram_iv,
        json_build_object(
          'domestic_access_key', ue.domestic_access_key,
          'domestic_access_iv', ue.domestic_access_iv,
          'domestic_secret_key', ue.domestic_secret_key,
          'domestic_secret_iv', ue.domestic_secret_iv,
          'overseas_access_key', ue.overseas_access_key,
          'overseas_access_iv', ue.overseas_access_iv,
          'overseas_secret_key', ue.overseas_secret_key,
          'overseas_secret_iv', ue.overseas_secret_iv
        ) as user_env
      FROM 
        users AS u
      INNER JOIN
        user_statuses AS us ON u.id = us.user_id
      INNER JOIN
        user_envs as ue ON us.trade_user_env_id = ue.id
      WHERE
        us.trading = true
        AND
        u.user_role_id <>
          (
          SELECT id FROM user_roles WHERE role = 'normal'
          )
      ;
      `
      return { query }
    },
    updateTelId: function(payload: IUpdateTelId) {
      const { user_id, telegram_id } = payload

      const { encryptedData, iv } = encrypt(telegram_id)
      
      const query =
      `
      UPDATE
        users
      SET
        telegram_id = $1,
        telegram_iv = $2
      WHERE
        id = $3
      `
      const queryValues = [encryptedData, iv, user_id]

      return { query, queryValues }
    }
  }

  Exec = {
    create: async (payload: CreateUserPayload): Promise<void> => {
      const { query: findByEmailQuery, queryValues: findByEmailQueryValues } = this.Query.findByEmail(payload.email)
      const { query: createQuery, queryValues: createQueryValues } = this.Query.create(payload)
      
      const client = await pool.connect()
      try {
        const users = await client.query<UserSchema>(findByEmailQuery, findByEmailQueryValues)
        const user = users.rows[0]

        if(user) throw new Error(`This User already exists.\t email: ${user.email}`)

        await client.query(createQuery, createQueryValues)
      } catch (error) {
        throw error
      } finally {
        await client.release()
      }
    },
    findByEmail: async (email: string): Promise<UserSchema | null> => {
      const { query, queryValues } = this.Query.findByEmail(email)

      try {
        const result = await pool.query<UserSchema>(query, queryValues)

        const row = result.rows[0]

        return row || null
      } catch (error) {
        throw error
      }
    },
    findById: async (id: number): Promise<UserSchema | null> => {
      const { query, queryValues } = this.Query.findById(id)

      try {
        const result = await pool.query<UserSchema>(query, queryValues)
        return result.rows[0] || null
      } catch(error) {
        throw error
      }
    },
    findWithEnv: async (): Promise<IUserTradeWithEnv[]> => {
      try {
        const { query } = this.Query.findWithEnv()
        const userTradeWithEnv = await pool.query<IOriginUserTradeWithEnv>(query)
        const users = userTradeWithEnv.rows

        const decodedUsers = users.map((user): IUserTradeWithEnv => {
          const userEnv = user.user_env
          const domestic_access_key = decrypt(userEnv.domestic_access_key, userEnv.domestic_access_iv)
          const domestic_secret_key = decrypt(userEnv.domestic_secret_key, userEnv.domestic_secret_iv)
          const overseas_access_key = decrypt(userEnv.overseas_access_key, userEnv.overseas_access_iv)
          const overseas_secret_key = decrypt(userEnv.overseas_secret_key, userEnv.overseas_secret_iv)
          const telegram_id = (user.telegram_id && user.telegram_iv) ? decrypt(user.telegram_id, user.telegram_iv) : null
          return {
            user_id: user.user_id,
            symbol_id: user.symbol_id,
            telegram_id,
            user_env: {
              domestic_access_key,
              domestic_secret_key,
              overseas_access_key,
              overseas_secret_key,
            }
          }
        })
        
        return decodedUsers
      } catch (error) {
        throw error
      }
    },
    updateTelId: async (payload: IUpdateTelId): Promise<void> => {
      try {
        const { query, queryValues } = this.Query.updateTelId(payload)

        await pool.query(query, queryValues)
      } catch (error) {
        throw error
      }
    }
  }
}

export type { UserSchema, CreateUserPayload, IUserTradeWithEnv }
export default new User()