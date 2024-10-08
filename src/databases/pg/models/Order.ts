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

class Order extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {}
  Exec = {}
}

export type { OrderSchema }
export default new Order()