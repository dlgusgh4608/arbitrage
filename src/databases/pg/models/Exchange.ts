import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'

interface ExchangeSchema {
  id: number
  domestic: string
  overseas: string
}

interface ExchangePayload {
  domestic: string
  overseas: string
}

class Exchange extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    create: function (payload: ExchangePayload) {
      const query = `INSERT INTO exchanges (domestic, overseas) VALUES ($1, $2);`
      const queryValues = [payload.domestic, payload.overseas]

      return { query, queryValues }
    },
    findOne: function(payload: ExchangePayload) {
      if(!payload.domestic) throw new Error('domestic is required')
      if(!payload.overseas) throw new Error('overseas is required')
      
      const query = `SELECT * FROM exchanges WHERE domestic = $1 AND overseas = $2 LIMIT 1;`
      const queryValues = [payload.domestic, payload.overseas]

      return { query, queryValues }
    }
  }

  Exec = {
    create: async (payload: ExchangePayload): Promise<void> => {
      const { query: findOneQuery, queryValues } = this.Query.findOne(payload)
      const { query: createQuery } = this.Query.create(payload)
      
      const client = await pool.connect()
      try {
        const exchanges = await client.query<ExchangeSchema>(findOneQuery, queryValues)
        const exchange = exchanges.rows[0]
        if(exchange) throw new Error(`This exchange already exists.\t domestic: ${exchange.domestic} overseas: ${exchange.overseas}`)

        await client.query(createQuery, queryValues)
      } catch (error) {
          throw error
      } finally {
        await client.release()
      }
    },
    findOne: async (payload: ExchangePayload): Promise<ExchangeSchema | null> => {
      try {
        const { query, queryValues } = this.Query.findOne(payload)
        const result = await pool.query<ExchangeSchema>(query, queryValues)

        return result.rows[0]
      } catch (error) {
        throw error
      }
    }
  }
}

export type { ExchangeSchema }
export default new Exchange()