import { pool } from '@databases/pg'
import { ModelObject, IModelObject } from './ModelObject'
import { UserEnv, Symbol } from '@models'

import type { SymbolSchema, UserEnvSchema } from './types'

interface UserStatusSchema {
  user_id: number
  trade_user_env_id: number
  trade_symbol_id: number
  trading: boolean
}

class UserStatus extends ModelObject implements IModelObject {
  constructor() { super() }

  Query = {
    create: function(payload: UserStatusSchema) {
      if(!payload.user_id) throw new Error('user_id is required')
      if(!payload.trade_user_env_id) throw new Error('trade_user_env_id is required')
      if(!payload.trade_symbol_id) throw new Error('trade_symbol_id is required')
      if(!payload.trading) throw new Error('trading is required')

      const query = 
      `
      INSERT INTO user_statuses (user_id, trade_user_env_id, trade_symbol_id, trading)
      VALUES ($1, $2, $3, $4);
      `

      const queryValues = [
        payload.user_id,
        payload.trade_user_env_id,
        payload.trade_symbol_id,
        payload.trading
      ]

      return { query, queryValues }
    }
  }

  Exec = {
    create: async (payload: UserStatusSchema): Promise<void> => {
      const userStatusQueries = this.Query.create(payload)
      const symbolQueries = Symbol.Query.fineById(payload.trade_symbol_id)

      const client = await pool.connect()
      try {
        // 해당 심볼 아이디 있는지 검사
        const symbols = await client.query<SymbolSchema>(symbolQueries.query, symbolQueries.queryValues)
        const symbol = symbols.rows[0]
        if(!symbol) throw new Error(`No symbol matching from symbol_id\t symbol_id: ${payload.trade_symbol_id}`)
        
        // UserEnv에 해당 user_id와 exchange_id가 일치하는걸 가져와 payload의 user_env_id와 일치하는지 검사
        const userEnvQueries = UserEnv
          .Query
          .findByUserIdAndExchangeId({ user_id: payload.user_id, exchange_id: symbol.exchange_id })

        const userEnvs = await client.query<UserEnvSchema>(userEnvQueries.query, userEnvQueries.queryValues)
        const userEnv = userEnvs.rows[0]
        if(!userEnv) throw new Error(`Don't fined user_id and exchange_id from user_env\t user_id: ${payload.user_id}\t exchange_id: ${symbol.exchange_id}`)
        if(userEnv.id !== payload.trade_user_env_id) throw new Error(`No matching user_env_id\t user_env_id: ${payload.trade_user_env_id}`)

        await client.query(userStatusQueries.query, userStatusQueries.queryValues)
      } catch (error) {
        throw error
      } finally {
        await client.release()
      }
    }
  }
}

export type { UserStatusSchema }
export default new UserStatus()