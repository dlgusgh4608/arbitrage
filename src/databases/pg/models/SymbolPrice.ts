import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

interface SymbolPriceSchema {
  symbol_id: number
  created_at: Date
  premium: number
  domestic: number
  overseas: number
  usd_to_krw: number
  domestic_trade_at: Date
  overseas_trade_at: Date
}

class SymbolPrice extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    bulkInsert: (payload: SymbolPriceSchema[]) => {
      const { keysStr, values, valuesStr } = this.generateInsertValues(payload)

      const query = `INSERT INTO symbol_prices (${keysStr}) VALUES ${valuesStr};`

      return { query, queryValues: values }
    }
  }

  Exec = {
    bulkInsert: async (payload: SymbolPriceSchema[]): Promise<void> => {
      const { query, queryValues } = this.Query.bulkInsert(payload)

      try {
        await pool.query(query, queryValues)
      } catch (error) {
        throw error
      }
    }
  }
}

export type { SymbolPriceSchema }
export default new SymbolPrice()