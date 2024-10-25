import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

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

interface IPremiumBySymbolIdInMinuteResponse {
  avg_usd_to_krw: number
  min_premium: number
  max_premium: number
}

class SymbolPrice extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    bulkInsert: (payload: SymbolPriceSchema[]) => {
      const { keysStr, values, valuesStr } = this.generateInsertValues(payload)

      const query = `INSERT INTO symbol_prices (${keysStr}) VALUES ${valuesStr};`

      return { query, queryValues: values }
    },
    findPremiumBySymbolIdInMinute: function(symbol_id: number, minute: number = 360) { // default 6hour
      const limit = minute * 60
      const intervalToSecond = (minute + 5) * 60
      const query =
      `
      WITH limit_values AS (
        SELECT 
          domestic,
          overseas,
          created_at,
          usd_to_krw
        FROM 
          symbol_prices
        WHERE 
          symbol_id = $1
        ORDER BY
          created_at DESC
        LIMIT $2
      ),
      avg_value AS (
        SELECT
          AVG(usd_to_krw) AS avg_usd_to_krw
        FROM
          limit_values
      )
      SELECT 
        av.avg_usd_to_krw AS avg_usd_to_krw,
        CASE 
          WHEN MIN(lv.created_at) < NOW() - INTERVAL '1 second' * $3 THEN NULL
          ELSE CAST(
            ROUND(
              MAX((lv.domestic / ROUND(lv.overseas * av.avg_usd_to_krw) - 1) * 100)::numeric,
              4
            ) AS float
          ) 
        END AS max_premium,
        CASE 
          WHEN MIN(lv.created_at) < NOW() - INTERVAL '1 second' * $3 THEN NULL
          ELSE CAST(
            ROUND(
              MIN((lv.domestic / ROUND(lv.overseas * av.avg_usd_to_krw) - 1) * 100)::numeric,
              4
            ) AS float
          ) 
        END AS min_premium
      FROM 
        limit_values AS lv,
        avg_value AS av
      GROUP BY
        av.avg_usd_to_krw;
      `

      return { query, queryValues: [symbol_id, limit, intervalToSecond] }
    }
  }

  Exec = {
    bulkInsert: async (payload: SymbolPriceSchema[]): Promise<void> => {
      const { query, queryValues } = this.Query.bulkInsert(payload)

      try {
        await pool.query(query, queryValues)
      } catch (error) {
        throw error
      }
    },
    findPremiumBySymbolIdInMinute: async (symbol_id: number, minute: number = 360): Promise<IPremiumBySymbolIdInMinuteResponse> => {
      if(minute < 60) throw new Error('minium minute is 60')
      
      const { query, queryValues } = this.Query.findPremiumBySymbolIdInMinute(symbol_id, minute)
      try {
        const { rows } = await pool.query<IPremiumBySymbolIdInMinuteResponse>(query, queryValues)
        
        return rows[0]
      } catch (error) {
        throw error
      }
    }
  }
}

export type { SymbolPriceSchema, IPremiumBySymbolIdInMinuteResponse }
export default new SymbolPrice()