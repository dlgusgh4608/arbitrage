import { pool } from '@databases/pg'

interface SymbolSchema {
  id: number
  name: string
  exchange_id: number
}

interface SymbolWithExchange {
  id: number
  name: string
  domestic: number
  overseas: number
}

const Symbol = {
  getAll: async (): Promise<SymbolWithExchange[]> => {
    const client = await pool.connect()
    try {
      const result = await client.query<SymbolWithExchange>(
        `
        SELECT s.id as id, s.name as name, e.domestic as domestic, e.overseas as overseas
        FROM symbols s
        INNER JOIN exchanges e ON e.id = s.exchange_id;
        `
      )
      return result.rows
    } catch (error) {
      throw error
    } finally {
      await client.release()
    }
  }
}

export type { SymbolSchema, SymbolWithExchange }
export default Symbol