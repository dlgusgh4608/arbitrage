import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

interface OrderSchema {
  id: number
  symbol_id: number
  user_id: number
  is_close: boolean
  net_profit_rate?: number
  created_at: Date
}

interface ICreateOrderPayload {
  symbol_id: number
  user_id: number
}

class Order extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    create: (payload: ICreateOrderPayload) => {
      const { keysStr, values, valuesStr } = this.generateInsertValues([payload])
      
      const query = 
      `
      INSERT INTO orders (${keysStr})
      VALUES ${valuesStr}
      RETURNING id;
      `

      return { query, queryValues: values }
    }
  }
  Exec = {
    create: async (payload: ICreateOrderPayload): Promise<{ id: number }> => {
      try {
        const { query, queryValues } = this.Query.create(payload)

        const returningIds = await pool.query<{ id: number }>(query, queryValues)

        return returningIds.rows[0]
      } catch (error) {
        throw error
      }
    }
  }
}

export type { OrderSchema }
export default new Order()