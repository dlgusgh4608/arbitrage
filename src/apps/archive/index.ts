import { EventEmitter } from "stream";
import { scheduleJob } from 'node-schedule'
import { redisClient } from '@databases/redis'
import { SymbolPrice } from '@models'
import { SECOND_CRON, MINUTE_CRON } from '@utils/constants'
import { getTimeDifference } from '@utils'
import dayjs from 'dayjs'

import type { SymbolWithExchange, SymbolPriceSchema } from '@models/types'
import type { Premium } from '../collector/types'
import type { PremiumRedisBufferData } from './types'

const TIME_DIFFERENCE_LIMIT_SEC = 60

class RedisService {
  #symbols: SymbolWithExchange[] = []
  #client = redisClient
  constructor(symbols: SymbolWithExchange[]) {
    this.#symbols = symbols
  }

  async push(data: { [key: string]: Premium }): Promise<void> {
    try {
      const pipeline = this.#client.pipeline()
      const now = dayjs().toDate()

      for (const symbol of this.#symbols) {
        const { name, domestic, overseas } = symbol
        const key = [name, domestic, overseas].join('-')
        
        const premium = data[key]
        if(!premium) continue
  
        const { domesticTradeAt, overseasTradeAt } = premium
        if(Math.abs(getTimeDifference(domesticTradeAt, overseasTradeAt)) > TIME_DIFFERENCE_LIMIT_SEC) continue

        const payload = {
          ...premium,
          createdAt: now
        }
  
        pipeline.rpush(key, JSON.stringify(payload))
      }

      await pipeline.exec()
    } catch (error) {
      throw error
    }

  }

  async popMultiple<T extends object>(count: number): Promise<{ [key: string]: T[] }> {
    try {
      const payload: { [key: string]: T[] } = {}
      
      for (const symbol of this.#symbols) {
        const { name, domestic, overseas } = symbol
        const key = [name, domestic, overseas].join('-')
        const response = await this.#client.list(key).popMultiple<T>(count)

        if(response.length > 0) payload[key] = response
      }

      return payload
    } catch (error) {
      throw error
    }
  }

  async clearList(): Promise<void> {
    try {
      for (const symbol of this.#symbols) {
        const { name, domestic, overseas } = symbol
        const key = [name, domestic, overseas].join('-')
        await this.#client.list(key).delete()
        console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tRedis List Clear\t${key}`)
      }
    } catch (error) {
      throw error
    }
  }
}

export class Archive {
  #emitter: EventEmitter = new EventEmitter()
  #redisService?: RedisService
  #symbols: SymbolWithExchange[] = []
  #data: { [key: string]: Premium } = {}

  constructor(emitter: EventEmitter, symbols: SymbolWithExchange[]) {
    this.#emitter = emitter
    this.#symbols = symbols
    this.#redisService = new RedisService(symbols)
  }

  #onSymbolTrade = (): void => {
    for(const symbol of this.#symbols) {
      try {
        const { name, domestic, overseas } = symbol
        const key = [name, domestic, overseas].join('-')
        const customerKey = [key, 'trade'].join('-')
        this.#emitter.on(customerKey, (data: Premium) => { this.#data[key] = data })
      } catch (error) {
        throw error
      }
    }
  }

  #clearData = (): void => {
    this.#data = {}
  }
  
  #pushRedisServiceOnSec = (): void => {
    try { 
      scheduleJob(SECOND_CRON, async () => {
        try {
          await this.#redisService?.push(this.#data)
          this.#clearData()
        } catch (error) {
          throw error
        }
      })
    } catch (error) {
      throw error
    }
  }

  #insertRedisToPgOnMin = (): void => {
    try {
      scheduleJob(MINUTE_CRON, async () => {
        try {
          const response = await this.#redisService?.popMultiple<PremiumRedisBufferData>(60)
  
          for (const symbol of this.#symbols) {
            const { id, name, domestic, overseas } = symbol
            const key = [name, domestic, overseas].join('-')
            const premium = response?.[key]
  
            if(!premium) continue

            const payload = premium.map(
              ({ domestic, usdToKrw, overseas, premium, createdAt, domesticTradeAt, overseasTradeAt }): SymbolPriceSchema => ({
                symbol_id: id,
                created_at: dayjs(createdAt).toDate(),
                premium: premium,
                domestic: domestic,
                overseas: overseas,
                usd_to_krw: usdToKrw,
                domestic_trade_at: dayjs(domesticTradeAt).toDate(),
                overseas_trade_at: dayjs(overseasTradeAt).toDate(),
              })
            )
  
            await SymbolPrice.bulkInsert(payload)
            const stringToKB = Buffer.from(JSON.stringify(premium)).byteLength / 1024
            console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tArchive Premium to PG\t${key}\tlength: ${premium.length}\tstringifyKB: ${stringToKB}KB`)
          }
        } catch (error) {
          throw error
        }
      })
    } catch (error) {
      throw error
    }
  }

  async run() {
    try {
      await this.#redisService?.clearList()
      this.#onSymbolTrade()
      this.#pushRedisServiceOnSec()
      this.#insertRedisToPgOnMin()
    } catch (error) {
      throw error
    }
  }

}