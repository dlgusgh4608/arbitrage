import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

interface BuyOrderSchema {
  id: string
  symbol_id: number
  user_id: number
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
  is_close: boolean
  created_at: Date
}

interface IBuyOrderCreatePayload {
  id: string
  symbol_id: number
  user_id: number
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
}

interface IFindOpenOrdersPayload {
  symbol_id: number
  user_id: number
}

interface IBuyOrderResponse {
  id: string
  domestic_price: number
  domestic_quantity: number
  domestic_commission: number
  overseas_price: number
  overseas_quantity: number
  overseas_commission: number
  usd_to_krw: number
}

interface IBuyOpenOrderResponse {
  id: string
  domestic_price: number
  domestic_quantity: number
  sold_domestic_quantity: number
  domestic_commission: number
  overseas_price: number
  overseas_quantity: number
  sold_overseas_quantity: number
  overseas_commission: number
  usd_to_krw: number
}

class BuyOrder extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    create: (payload: Required<IBuyOrderCreatePayload>) => {
      const { keysStr, values, valuesStr } = this.generateInsertValues([payload])
      
      const query =
      `
      INSERT INTO buy_orders (${keysStr})
      VALUES ${valuesStr}
      RETURNING
        id,
        domestic_price,
        domestic_quantity,
        domestic_commission,
        overseas_price,
        overseas_quantity,
        overseas_commission,
        usd_to_krw
      ;`

      return { query, queryValues: values }
    },  
    findOpenOrders: function(payload: Required<IFindOpenOrdersPayload>) {
      const query =
      `
      SELECT
        bo.id AS id,
        bo.domestic_price AS domestic_price,
        bo.domestic_quantity AS domestic_quantity,
        COALESCE(
          ROUND(
            SUM(so.domestic_quantity)::numeric,
            8
          ),
          0
        ) AS sold_domestic_quantity,
        bo.domestic_commission AS domestic_commission,
        bo.overseas_price AS overseas_price,
        bo.overseas_quantity AS overseas_quantity,
        COALESCE(
          ROUND(
            SUM(so.overseas_quantity)::numeric,
            8
          ),
          0
        ) AS sold_overseas_quantity,
        bo.overseas_commission AS overseas_commission,
        bo.usd_to_krw AS usd_to_krw
      FROM
        buy_orders AS bo
      LEFT JOIN
        sell_orders AS so
      ON
        bo.id = so.buy_order_id
      WHERE 
        bo.symbol_id = $1 AND
        bo.user_id = $2 AND
        bo.is_close = FALSE
      GROUP BY
        bo.id
      ;`

      return { query, queryValues: [payload.symbol_id, payload.user_id] }
    },
    updateToClose: function(id: string) {
      if(!id) throw new Error('id is required')

      const query =
      `
      UPDATE
        buy_orders
      SET
        is_close = TRUE
      WHERE
        id = $1
      ;`

      return { query, queryValues: [id] }
    }
  }
  Exec = {
    create: async (payload: Required<IBuyOrderCreatePayload>): Promise<IBuyOrderResponse> => {
      try {
        const { query, queryValues } = this.Query.create(payload)

        const { rows } = await pool.query<IBuyOrderResponse>(query, queryValues)

        return rows[0]
      } catch (error) {
        throw error
      }
    },
    findOpenOrders: async (payload: Required<IFindOpenOrdersPayload>): Promise<IBuyOpenOrderResponse[]> => {
      try {
        const { query, queryValues } = this.Query.findOpenOrders(payload)

        const { rows } = await pool.query<IBuyOpenOrderResponse>(query, queryValues)
        return rows
      } catch (error) {
        throw error
      }
    },
    updateToClose: async (id: string): Promise<void> => {
      try {
        const { query, queryValues } = this.Query.updateToClose(id)
        await pool.query(query, queryValues)
      } catch (error) {
        throw error
      }
    }
  }
}

export type { BuyOrderSchema, IBuyOrderResponse, IBuyOpenOrderResponse, IBuyOrderCreatePayload }
export default new BuyOrder()