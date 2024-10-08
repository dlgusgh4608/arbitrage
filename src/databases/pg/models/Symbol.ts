import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

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

class Symbol extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    find: function() {
      const query =
      `
      SELECT s.id as id, s.name as name, e.domestic as domestic, e.overseas as overseas
      FROM symbols s
      INNER JOIN exchanges e ON e.id = s.exchange_id;
      `

      return { query }
    },
    fineById: function(id: number) {
      if(!id) throw new Error(`id is required`)
      const query = 
      `
      SELECT * FROM symbols WHERE id = $1 LIMIT 1;
      `

      const queryValues = [id]

      return { query, queryValues }
    }
  }

  Exec = {
    find: async (): Promise<SymbolWithExchange[]> => {
      const { query } = this.Query.find()

      try {
        const result = await pool.query<SymbolWithExchange>(query)
        return result.rows
      } catch (error) {
        throw error
      }
    },
    findById: async (id: number): Promise<null | SymbolSchema> => {
      try {
        const { query, queryValues } = this.Query.fineById(id)

        const symbols = await pool.query<SymbolSchema>(query, queryValues)
        const symbol = symbols.rows[0]

        if(!symbol) return null

        return symbol
      } catch (error) {
        throw error
      }
    }
  }
}

export type { SymbolSchema, SymbolWithExchange }
export default new Symbol()