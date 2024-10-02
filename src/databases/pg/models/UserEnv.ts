import { pool } from '@databases/pg'

interface UserEnvSchema {
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

interface CreateUserEnvPayload {
  user_id: number
  exchange_id: number
  domestic_access_key: string
  domestic_access_iv: string
  domestic_secret_key: string
  domestic_secret_iv: string
}

const UserEnv = {
  create: async (payload: CreateUserEnvPayload): Promise<void> => {
    if(!payload.user_id) throw new Error('user_id is required')
    if(!payload.exchange_id) throw new Error('exchange_id is required')
    if(!payload.domestic_access_key) throw new Error('domestic_access_key is required')
    if(!payload.domestic_access_iv) throw new Error('domestic_access_iv is required')
    if(!payload.domestic_secret_key) throw new Error('domestic_secret_key is required')
    if(!payload.domestic_secret_iv) throw new Error('domestic_secret_iv is required')
    
    const client = await pool.connect()
    try {
        const query = 
        `
        INSERT INTO user_envs
          (user_id, exchange_id, domestic_access_key, domestic_access_iv, domestic_secret_key, domestic_secret_iv)
        VALUES
          ($1, $2, $3, $4, $5, $6);
        `
        await client.query<UserEnvSchema>(
          query,
          [
            payload.user_id,
            payload.exchange_id,
            payload.domestic_access_key,
            payload.domestic_access_iv,
            payload.domestic_secret_key,
            payload.domestic_secret_iv
          ]
        )
    } catch (error) {
        throw error
    } finally {
      await client.release()
    }
  }
}

export type { UserEnvSchema }
export default UserEnv