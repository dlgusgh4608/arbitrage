export interface SymbolPriceSymbolSchema {
    symbol_id: number
    created_at: Date
    premium: number
    domestic: number
    overseas: number
    usd_to_krw: number
    domestic_trade_at: Date
    overseas_trade_at: Date
}