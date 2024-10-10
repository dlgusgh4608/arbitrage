import EventEmitter from 'events'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dayjs from 'dayjs'

import { isNotNumber } from '@utils/regex'
import { USD_TO_KRW } from '@utils/constants'

const GOOGLE_FINANCE_URL = 'https://www.google.com/finance/quote/USD-KRW'
const CURRENT_SELECTOR = 'div.YMlKec.fxKbKc'

export class UsdToKrw {
  private intervalSec: number = 10
  private emitterOut: EventEmitter | undefined
  private exchangeRate: number = 0
  constructor(intervalSec: number = 10) {
    this.intervalSec = intervalSec
  }

  private async getUsdToKrw(): Promise<number> {
    try {
      const { data } = await axios.get(GOOGLE_FINANCE_URL)

      const $ = cheerio.load(data)

      const exchangeRateToString = $(CURRENT_SELECTOR).text().replace(isNotNumber, '')
      
      const exchangeRate = Number(exchangeRateToString)

      return exchangeRate
    } catch (error) {
      throw error
    }
  }

  bind(emitter = new EventEmitter()) { this.emitterOut = emitter }

  async run() {
    try {
      if(!this.emitterOut) throw new Error('bind first!')
      
      const exchangeRate = await this.getUsdToKrw()
      console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tGet First UsdToKrw ${exchangeRate}`)
      this.exchangeRate = exchangeRate
      this.emitterOut.emit(USD_TO_KRW, this.exchangeRate)

      setInterval(async () => {
        if(!this.emitterOut) throw new Error('bind first!')
        
        const exchangeRate = await this.getUsdToKrw()

        if(!exchangeRate && this.exchangeRate !== exchangeRate) {
          console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tUpdate UsdToKrw ${this.exchangeRate} -> ${exchangeRate}`)
          this.exchangeRate = exchangeRate
          this.emitterOut.emit(USD_TO_KRW, this.exchangeRate)
        }
      }, this.intervalSec * 1000)
    } catch (error) {
      this.emitterOut?.emit('error', error)
    }
  }
}