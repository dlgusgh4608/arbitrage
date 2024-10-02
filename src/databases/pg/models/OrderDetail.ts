import { pool } from '@databases/pg'

interface OrderDetailSchema {
    id: number
    order_id: number
    status: 'buy' | 'sell'
    premium: number
    domestic: number
    overseas: number
    usd_to_krw: number
    is_maker: boolean
    domestic_trade_at: Date
    overseas_trade_at: Date
    created_at: Date
}

const OrderDetail = {}

export type { OrderDetailSchema }
export default OrderDetail