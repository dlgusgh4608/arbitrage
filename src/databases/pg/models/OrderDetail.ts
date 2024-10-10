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

class OrderDetail extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {}
  Exec = {}
}

export type { OrderDetailSchema }
export default new OrderDetail()