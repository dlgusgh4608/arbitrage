import { pool } from '@databases/pg'

interface OrderSchema {
  id: number
  symbol_id: number
  user_id: number
  is_close: boolean
  net_profit_rate?: number
  created_at: Date
}

const Order = {}

export type { OrderSchema }
export default Order