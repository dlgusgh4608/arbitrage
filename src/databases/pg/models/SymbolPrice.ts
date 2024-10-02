import { pool } from '@databases/pg'

interface SymbolPriceSchema {
    symbol_id: number
    created_at: Date
    premium: number
    domestic: number
    overseas: number
    usd_to_krw: number
    domestic_trade_at: Date
    overseas_trade_at: Date
}

const SymbolPrice = {
    createSymbolPrice: async (payload: SymbolPriceSchema[]) => {
        const client = await pool.connect()
        try {
            const keys = Object.keys(payload[0])
            const keysStr = keys.join(', ')
            const valuesStr = payload.map(
                (_, idx) => `(
                    ${keys.map((_, index) => `$${idx * keys.length + index + 1}`).join(', ')}
                )`
            ).join(', ')
            const values = payload.flatMap(item => Object.values(item))
            
            const result = await client.query<SymbolPriceSchema>(
                `
                INSERT INTO symbol_prices (${keysStr})
                VALUES ${valuesStr}
                `,
                values
            )
            return result.rows
        } catch (error) {
            throw error
        } finally {
            client.release()
        }
    }
}

export type { SymbolPriceSchema }
export default SymbolPrice