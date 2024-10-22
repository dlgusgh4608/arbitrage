import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

interface SellOrderSchema {
  id: number
  buy_order_id: string
  premium: number
  domestic_price: number
  domestic_quantity: number
  domestic_commission: number
  overseas_price: number
  overseas_quantity: number
  overseas_commission: number
  usd_to_krw: number
  is_maker: boolean
  domestic_trade_at: Date
  overseas_trade_at: Date
  profit_rate: number
  net_profit_rate: number
  created_at: Date
}

interface ISellOrderCreatePayload {
  buy_order_id: string
  premium: number
  domestic_price: number
  domestic_quantity: number
  domestic_commission: number
  overseas_price: number
  overseas_quantity: number
  overseas_commission: number
  usd_to_krw: number
  is_maker: boolean
  domestic_trade_at: Date
  overseas_trade_at: Date
  profit_rate: number
  net_profit_rate: number
}

interface ISellOrderResponse {
  buy_order_id: string
  domestic_quantity: number
  overseas_quantity: number
}

class SellOrder extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    create: (payload: Required<ISellOrderCreatePayload>) => {
      const { keysStr, values, valuesStr } = this.generateInsertValues([payload])

      const query =
      `
      INSERT INTO sell_orders (${keysStr})
      VALUES ${valuesStr}
      RETURNING
        buy_order_id,
        domestic_quantity,
        overseas_quantity
      `

      return { query, queryValues: values }
    }
  }
  Exec = {
    create: async (payload: Required<ISellOrderCreatePayload>): Promise<ISellOrderResponse> => {
      try {
        const { query, queryValues } = this.Query.create(payload)

        const { rows } = await pool.query<ISellOrderResponse>(query, queryValues)
        return rows[0]
      } catch (error) {
        throw error
      }
    }
  }
}

export type { SellOrderSchema }
export default new SellOrder()