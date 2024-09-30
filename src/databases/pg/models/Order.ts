export interface OrderSchema {
  id: number
  symbol_id: number
  user_id: number
  is_close: boolean
  net_profit_rate?: number
  created_at: Date
}