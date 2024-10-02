import { pool } from '@databases/pg'

interface ExchangeSchema {
  id: number
  domestic: string
  overseas: string
}

interface CreateExchangePayload {
  domestic: string
  overseas: string
}

const Exchange = {
  create: async (payload: CreateExchangePayload): Promise<void> => {
    if(!payload.domestic) throw new Error('domestic is required')
    if(!payload.overseas) throw new Error('overseas is required')
    
    const client = await pool.connect()
    try {
        const query = 'INSERT INTO exchanges (domestic, overseas) VALUES ($1, $2);'
        await client.query<ExchangeSchema>(query, [payload.domestic, payload.overseas])
    } catch (error) {
        throw error
    } finally {
        await client.release()
    }
  },
  findOne: async (payload: CreateExchangePayload): Promise<ExchangeSchema> => {
    const client = await pool.connect()
    try {
      if(!payload.domestic) throw new Error('domestic is required')
      if(!payload.overseas) throw new Error('overseas is required')
      
      const query = 'SELECT * FROM exchanges WHERE domestic = $1 AND overseas = $2 LIMIT 1;'
      const result = await client.query<ExchangeSchema>(query, [payload.domestic, payload.overseas])
      return result.rows[0]
    } catch (error) {
        throw error
    } finally {
        await client.release()
    }
  }
}

export type { ExchangeSchema }
export default Exchange