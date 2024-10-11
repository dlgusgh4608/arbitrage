import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

interface OrderDetailSchema {
  id: number
  order_id: number
  status: 'buy' | 'sell'
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
  created_at: Date
}

interface IOrderDetailCreateReturn {
  status: 'buy' | 'sell'
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

interface IOrderDetailCreate extends IOrderDetailCreateReturn {
  order_id: number
}



class OrderDetail extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    create: (payload: IOrderDetailCreate) => {
      if(!payload.order_id) throw new Error('order_id is required')
      if(payload.status !== 'buy' && payload.status === 'sell') throw new Error('status must be buy or sell')
      if(!payload.premium) throw new Error('premium is required') // 역프(-%)도 가능함.
      if(!payload.domestic_price || payload.domestic_price < 0) throw new Error('domestic_price value is over 0, required')
      if(!payload.domestic_quantity || payload.domestic_quantity < 0) throw new Error('domestic_quantity value is over 0, required')
      if(!payload.domestic_commission || payload.domestic_commission < 0) throw new Error('domestic_commission value is over 0, required')
      if(!payload.overseas_price || payload.overseas_price < 0) throw new Error('overseas_price value is over 0, required')
      if(!payload.overseas_quantity || payload.overseas_quantity < 0) throw new Error('overseas_quantity value is over 0, required')
      if(!payload.overseas_commission || payload.overseas_commission < 0) throw new Error('overseas_commission value is over 0, required')
      if(!payload.usd_to_krw || payload.usd_to_krw < 0) throw new Error('usd_to_krw value is over 0, required')
      if(!payload.domestic_trade_at) throw new Error('domestic_trade_at is required')
      if(!payload.overseas_trade_at) throw new Error('overseas_trade_at is required')
      const is_maker = !!payload.is_maker

      const { keysStr, values, valuesStr } = this.generateInsertValues([{ ...payload, is_maker }])


      const query =
      `
      INSERT INTO order_details (${keysStr})
      VALUES ${valuesStr}
      RETURNING
        status,
        premium,
        domestic_price,
        domestic_quantity,
        domestic_commission,
        overseas_price,
        overseas_quantity,
        overseas_commission,
        usd_to_krw,
        is_maker,
        domestic_trade_at,
        overseas_trade_at;
      `

      return { query, queryValues: values }
    }
  }
  Exec = {
    create: async (payload: IOrderDetailCreate): Promise<IOrderDetailCreateReturn> => {
      try {
        const { query, queryValues } = this.Query.create(payload)

        const { rows } = await pool.query<IOrderDetailCreateReturn>(query, queryValues)

        return rows[0]
      } catch (error) {
        throw error
      }
    }
  }
}

export type { OrderDetailSchema }
export default new OrderDetail()