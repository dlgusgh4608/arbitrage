import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'
import { encrypt, decrypt } from '@utils/crypto'
import User from './User'

interface UserEnvSchema {
  id: number
  user_id: number
  exchange_id: number
  domestic_access_key: string
  domestic_access_iv: string
  domestic_secret_key: string
  domestic_secret_iv: string
  overseas_access_key: string
  overseas_access_iv: string
  overseas_secret_key: string
  overseas_secret_iv: string
  created_at: Date
  updated_at: Date
}

interface IFindByUserIdAndExchangeId {
  user_id: number
  exchange_id: number
}

interface CreateUserEnvPayload extends IFindByUserIdAndExchangeId {
  domestic_access_key: string
  domestic_secret_key: string
  overseas_access_key: string
  overseas_secret_key: string
}

class UserEnv extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    create: function(payload: CreateUserEnvPayload) {
      if(!payload.domestic_access_key) throw new Error('domestic_access_key is required')
      if(!payload.domestic_secret_key) throw new Error('domestic_secret_key is required')
      if(!payload.overseas_access_key) throw new Error('overseas_access_key is required')
      if(!payload.overseas_secret_key) throw new Error('overseas_secret_key is required')
  
      const { encryptedData: domestic_access_key, iv: domestic_access_iv } = encrypt(payload.domestic_access_key)
      const { encryptedData: domestic_secret_key, iv: domestic_secret_iv } = encrypt(payload.domestic_secret_key)
      const { encryptedData: overseas_access_key, iv: overseas_access_iv } = encrypt(payload.overseas_access_key)
      const { encryptedData: overseas_secret_key, iv: overseas_secret_iv } = encrypt(payload.overseas_secret_key)
      
      const query = 
      `
      INSERT INTO user_envs
        (
          user_id,
          exchange_id,
          domestic_access_key,
          domestic_access_iv,
          domestic_secret_key,
          domestic_secret_iv,
          overseas_access_key,
          overseas_access_iv,
          overseas_secret_key,
          overseas_secret_iv
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `

      const queryValues = [
        payload.user_id,
        payload.exchange_id,
        domestic_access_key,
        domestic_access_iv,
        domestic_secret_key,
        domestic_secret_iv,
        overseas_access_key,
        overseas_access_iv,
        overseas_secret_key,
        overseas_secret_iv,
      ]

      return { query, queryValues }
    },
    findByUserIdAndExchangeId: function(payload: IFindByUserIdAndExchangeId) {
      if(!payload.user_id) throw new Error('user_id is required')
      if(!payload.exchange_id) throw new Error('exchange_id is required')
      
      const query = 
      `
      SELECT *
      FROM user_envs
      WHERE user_id = $1 AND exchange_id = $2;
      `
      
      const queryValues = [payload.user_id, payload.exchange_id]

      return { query, queryValues }
    }
  }

  Exec = {
    create: async (payload: CreateUserEnvPayload): Promise<void> => {
      const {
        query: findOneQuery,
        queryValues: findOneQueryValues
      } = this.Query.findByUserIdAndExchangeId({ user_id: payload.user_id, exchange_id: payload.exchange_id })

      const {
        query: createQuery,
        queryValues: createQueryValues
      } = this.Query.create(payload)

      const client = await pool.connect()
      try {
        const userEnvs = await client.query<UserEnvSchema>(findOneQuery, findOneQueryValues)
        const userEnv = userEnvs.rows[0]

        if(userEnv) throw new Error(`This UserEnv already exists.\t user_id: ${payload.user_id} exchange_id: ${payload.exchange_id}`)

        await client.query(createQuery, createQueryValues)
      } catch (error) {
        throw error
      } finally {
        await client.release()
      }
    },
    findByUserIdAndExchangeId: async (payload: IFindByUserIdAndExchangeId): Promise<UserEnvSchema> => {
      const { query, queryValues } = this.Query.findByUserIdAndExchangeId(payload)

      try {
        const userEnvs = await pool.query<UserEnvSchema>(query, queryValues)
  
        return userEnvs.rows[0]
      } catch (error) {
        throw error
      }
    }
  }
}

export type { UserEnvSchema }
export default new UserEnv()