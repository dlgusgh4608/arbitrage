import EventEmitter from 'events'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dayjs from 'dayjs'

import { isNotNumber } from '@utils/regex'
import { EXCHANGE_RATE } from '@utils/constants'

const GOOGLE_FINANCE_URL = 'https://www.google.com/finance/quote/USD-KRW'
const CURRENT_SELECTOR = 'div.YMlKec.fxKbKc'

export class ExchangeRate {
  #intervalSec: number = 10
  #emitterOut: EventEmitter | undefined
  #exchangeRate: number = 0
  constructor(intervalSec: number = 10) {
    this.#intervalSec = intervalSec
  }

  async #getUsdToKrw(): Promise<number> {
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

  bind(emitter = new EventEmitter()) { this.#emitterOut = emitter }

  async run() {
    try {
      if(!this.#emitterOut) throw new Error('bind first!')
      
      const exchangeRate = await this.#getUsdToKrw()
      console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tGet First ExchangeRate ${exchangeRate}`)
      this.#exchangeRate = exchangeRate
      this.#emitterOut.emit(EXCHANGE_RATE, this.#exchangeRate)

      setInterval(async () => {
        if(!this.#emitterOut) throw new Error('bind first!')
        
        const exchangeRate = await this.#getUsdToKrw()

        if(this.#exchangeRate !== exchangeRate) {
          console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tUpdate ExchangeRate ${this.#exchangeRate} -> ${exchangeRate}`)
          this.#exchangeRate = exchangeRate
          this.#emitterOut.emit(EXCHANGE_RATE, this.#exchangeRate)
        }
      }, this.#intervalSec * 1000)
    } catch (error) {
      throw error
    }
  }
}