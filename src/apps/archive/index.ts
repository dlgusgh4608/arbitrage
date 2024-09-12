import { EventEmitter } from "stream";
import { scheduleJob } from 'node-schedule'
import { Premium } from '../collector'

interface Price {
  symbol: string
  open: number
  high: number
  close: number
  low: number
}

class PriceHandler {
  #symbol:string
  #open: number = 0
  #high: number = 0
  #close: number = 0
  #low: number = 0

  #isStarted: boolean = false
  
  constructor(symbol: string) {
    this.#symbol = symbol
  }

  #setInit(data: number) {
    this.#open = data
    this.#high = data
    this.#close = data
    this.#low = data
  }

  set(data: number) {
    if(!this.#isStarted) { // 첫 시작
      this.#setInit(data)
      this.#isStarted = true
      return
    }
    
    if(this.#high <= data) this.#high = data // 고점갱신

    if(this.#low >= data) this.#low = data // 저점갱신

    this.#close = data
  }

  get(): Price | undefined {
    if(!this.#isStarted) return // 각 데이터가 할당되기 전

    const payload: Price = {
      symbol: this.#symbol,
      open: this.#open,
      high: this.#high,
      close: this.#close,
      low: this.#low,
    }

    this.#setInit(this.#close) // 내보내기 전에 마지막 값(close)으로 초기화

    return payload
  }

}

export class Archive {
  #emitter: EventEmitter = new EventEmitter()

  #cron: string = '0 * * * * *' // database용량을 위해 분단위 저장

  constructor(emitter: EventEmitter) {
    this.#emitter = emitter
  }

  async #insertDatabase(handler: PriceHandler) {
    try {
      const ohlc = handler.get()

      if(!ohlc) throw new Error('ohlc is invalid')

      const {
        close,
        high,
        low,
        open,
        symbol
      } = ohlc

      const isInteger = [close, high, low, open].every((num: number) => Number.isInteger(num))

      if(isInteger) {
        // 정수 테이블 업로드
      }else {
        // 실수 테이블 업로드
      }

    } catch (error) {
      throw error
    }
  }
  
  async #runScheduleJob(handlers: PriceHandler[]) {
    try {
      scheduleJob(this.#cron, async () => {
        try {
          await Promise.all(handlers.map(this.#insertDatabase))
        } catch (error) {
          throw error
        }
      })
    } catch (error) {
      throw error
    }
  }

  async run() {
    const btcPremiumHandler = new PriceHandler('btc')

    this.#runScheduleJob([btcPremiumHandler])

    this.#emitter.on('premium', (premium: Premium) => {
      btcPremiumHandler.set(premium.premium)
    })
  }

}