import { pool } from '@databases/pg'

interface ExchangeSchema {
    id: number
    domestic: string
    overseas: string
}

const Exchange = {}

export type { ExchangeSchema }
export default Exchange