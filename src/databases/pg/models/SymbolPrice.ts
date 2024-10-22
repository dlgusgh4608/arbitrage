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

// interface SymbolPriceOfTime { // 혹시 몰라서 냅둠
//   date: Date
//   open: number
//   high: number
//   low: number
//   close: number
// }

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
    // findPremiumBySymbolIdInMinute: function(symbol_id: number) { // 혹시 몰라서 냅둠
    //   const query =
    //   `
    //   SELECT
    //     date,
    //     open_price.premium AS open,
    //     high,
    //     low,
    //     close_price.premium AS close
    //   FROM (
    //     SELECT
    //       symbol_id,
    //       DATE_TRUNC('minute', created_at) AS date,
    //       MAX(created_at) as close_created_at,
    //       MIN(created_at) as open_created_at,
    //       MAX(premium) as high,
    //       MIN(premium) as low
    //     FROM
    //       symbol_prices
    //     WHERE
    //       symbol_id = $1
    //     GROUP BY
    //       date, symbol_id
    //     ORDER BY
    //       date
    //   ) AS group_of_time
    //   INNER JOIN symbol_prices AS close_price
    //     ON
    //       group_of_time.close_created_at = close_price.created_at
    //     AND
    //       group_of_time.symbol_id = close_price.symbol_id
    //   INNER JOIN symbol_prices AS open_price
    //     ON
    //       group_of_time.open_created_at = open_price.created_at
    //     AND
    //       group_of_time.symbol_id = open_price.symbol_id
    //   `

    //   return { query, queryValues: [symbol_id] }

    // },
    findPremiumBySymbolIdInMinute: function(symbol_id: number, minute: number = 360) { // default 6hour
      const limit = minute * 60

      const query =
      `
      SELECT
        CAST(avg_usd_to_krw AS float) AS avg_usd_to_krw,
        CAST(
          ROUND(
            MIN(
              (domestic / ROUND(overseas * avg_usd_to_krw) - 1) * 100
            )::numeric,
            2
          ) AS float
        ) AS min_premium
        ,
        CAST(
          ROUND(
            MAX(
              (domestic / ROUND(overseas * avg_usd_to_krw) - 1) * 100
            )::numeric,
            2
          ) AS float
        ) AS max_premium
      FROM (
          SELECT
              ROUND(
                AVG(usd_to_krw)::numeric,
                4
              ) AS avg_usd_to_krw,
              domestic,
              overseas
          FROM
              symbol_prices
          WHERE
              symbol_id = $1
          GROUP BY domestic, overseas
          LIMIT $2
      ) AS sub_query
      GROUP BY
        avg_usd_to_krw;
      `

      return { query, queryValues: [symbol_id, limit] }
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