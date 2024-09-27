import EventEmitter from 'events'
import { Binance, BinanceOrderbook, BinanceTrade } from '@modules/binance/public/websocket'
import { ExchangeRate } from '@modules/exchange-rate'
import { UpbitPublic } from '@modules/upbit'
import { EXCHANGE_RATE } from '@utils/constants'
import { EventBroker } from '@modules/event-broker'
import { krwToUsd, getPremium, getTimeDifference } from '@utils'
import dayjs from 'dayjs'
import { SymbolSchema } from '@databases/pg/models'

import type { UpbitTrade, UpbitOrderbook, UpbitPublicWebsocketType } from '@modules/upbit'
import type { Premium, Orderbook } from './types'

const TIME_DIFFERENCE_LIMIT_SEC = 60
const EXCHANGE_RATE_INTERVAL_TIME_TO_SEC = 10
const PREMIUM_INTERVAL_TIME_TO_SEC = 100
const UPBIT_UNIQUE_SYMBOL = 'ConnectUpbitSocketForCollector'

export class Collector {
  #emitter: EventEmitter = new EventEmitter()

  #symbols: SymbolSchema[] = []

  #upbit?: UpbitPublicWebsocketType
  #binance?: Binance
  #exchangeRate: number = 0
  
  constructor(emitter: EventEmitter, symbols: SymbolSchema[]) {
    this.#emitter = emitter
    this.#symbols = symbols
  }

  #onExchangeRate = (response: number) => {
    this.#exchangeRate = response
  }

  #handleError = (error: any) => {
    this.#emitter.emit('error', error)
  }

  #publishPremium = () => {
    if(!this.#upbit) return
    if(!this.#binance) return
    if(this.#exchangeRate < 1000) return
    
    for(const symbol of this.#symbols) {
      const { name, domestic, overseas } = symbol
      const key = [name, domestic, overseas, 'trade'].join('-')
      const upbitData = this.#upbit.get('trade', name) as UpbitTrade
      const binanceData = this.#binance.get('trade', name) as BinanceTrade

      if(!upbitData || !binanceData) continue

      const upbitLastTradeTime = dayjs(upbitData.trade_timestamp).toDate()
      const binanceLastTradeTime = dayjs(binanceData.tradeTime).toDate()

      if(Math.abs(getTimeDifference(upbitLastTradeTime, binanceLastTradeTime)) > TIME_DIFFERENCE_LIMIT_SEC) {
        console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]:${key}\tTime difference between upbit and binance is more than ${TIME_DIFFERENCE_LIMIT_SEC} seconds`)
        this.#emitter.emit('error', `time difference between upbit and binance is more than ${TIME_DIFFERENCE_LIMIT_SEC} seconds`)
        
        continue
      }

      const fixedExchangeRate = this.#exchangeRate
      const { price: binancePrice } = binanceData
      const { trade_price: upbitPrice } = upbitData

      const upbitUSD = krwToUsd(upbitData.trade_price, fixedExchangeRate)
      const premium = getPremium(upbitUSD, binanceData.price)
      
      const payload: Premium = {
        symbol: name,
        premium,
        domestic: upbitPrice,
        overseas: binancePrice,
        exchangeRate: fixedExchangeRate,
        domesticTradeAt: upbitLastTradeTime,
        overseasTradeAt: binanceLastTradeTime
      }
      
      this.#emitter.emit(
        key,
        payload
      )
    }
  }

  #publishOrderbook = () => {
    if(!this.#upbit) return
    if(!this.#binance) return

    for(const symbol of this.#symbols) {
      const { name, domestic, overseas } = symbol
      const upbitData = this.#upbit.get('orderbook', name) as UpbitOrderbook
      const binanceData = this.#binance.get('orderbook', name) as BinanceOrderbook
      
      this.#emitter.emit(
        [symbol, domestic, overseas, 'orderbook'].join('-'),
        {
          upbit: upbitData,
          binance: binanceData,
        }
      )
    } 
  }

  #publish = () => {
    this.#publishPremium()
    this.#publishOrderbook()
  }
  
  run(): void {
    try {
      const symbolNames = this.#symbols.map(symbol => symbol.name)
      // PostgreSQL에 Symbols table이 비어있으면 에러 발생
      if(symbolNames.length === 0) throw new Error('symbolNames is empty')
        
      // 각 class를 생성
      const upbit = new UpbitPublic().websocket(symbolNames, UPBIT_UNIQUE_SYMBOL)
      const binance = new Binance(symbolNames)
      const exchangeRateApp = new ExchangeRate(EXCHANGE_RATE_INTERVAL_TIME_TO_SEC)
      
      // event broker 생성 후 연결
      const eventBroker = new EventBroker()
      eventBroker
        .subscribe(exchangeRateApp)
        .on(EXCHANGE_RATE, this.#onExchangeRate)
        .on('error', this.#handleError)

      // 각 class 실행
      upbit.run()
      binance.run()
      exchangeRateApp.run()

      // 각 class 저장
      this.#upbit = upbit
      this.#binance = binance

      // publish premium and orderbook
      setInterval(this.#publish, PREMIUM_INTERVAL_TIME_TO_SEC)
    } catch (error) {
      this.#emitter.emit('error', error)
    }
  }
}