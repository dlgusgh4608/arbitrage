import EventEmitter from 'events'
import axios from 'axios'
import { isNotNumber } from '../libs/regex'
import { EXCHANGE_RATE } from '../libs/variables'
import dayjs from 'dayjs'

const url = 'https://www.google.com/finance/quote/USD-KRW'

const currentDiv = '<div class="YMlKec fxKbKc">'

const exchangeRateLengthForGoogle = 10

class ExchangeRate {
  #intervalSec: number = 10
  #emitterOut: EventEmitter | undefined
  #exchangeRate: number = 0
  constructor(intervalSec: number = 10) {
    this.#intervalSec = intervalSec
  }

  async #getUsdToKrw(): Promise<number> {
    try {
      const { data }: { data: string } = await axios.get(url)

      const currentIndex = data.indexOf(currentDiv) + currentDiv.length

      const exchangeRateOfString = data
        .substring(currentIndex, currentIndex + exchangeRateLengthForGoogle)
        .replace(isNotNumber, '')

      const exchangeRate = Number(exchangeRateOfString)

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

export default ExchangeRate