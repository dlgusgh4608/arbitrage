import EventEmitter from 'events'
import {
  Binance,
  BinanceOrderbook,
  BinanceTrade,
} from '@modules/binance/public/websocket'

import { ExchangeRate } from '@modules/exchange-rate'
import {
  Upbit,
  UpbitOrderbook,
  UpbitTrade,
} from '@modules/upbit/public/websocket'

import {
  BINANCE_ORDERBOOK,
  BINANCE_TRADE,
  UPBIT_ORDERBOOK,
  UPBIT_TRADE,
  EXCHANGE_RATE
} from '@utils/variables'

import { EventBroker } from '@modules/event-broker'

import { krwToUsd, getPremium, usdToKrw } from '@utils'

interface BinanceTrades { [symbol: string]: BinanceTrade }
interface BinanceOrderbooks { [symbol: string]: BinanceOrderbook }

export interface Premium {
  symbol: string // 심볼: BTC, ETH
  premium: number // 김프
  upbitUSD: number // 업비트(USD)
  upbitKRW: number // 업비트(KRW)
  binanceUSD: number // 바이낸스(USD)
  binanceKRW: number // 바이낸스(KRW)
  exchangeRate: number // 환율
  upbitTimestamp: number // 업비트(TIME_STAMP)
  binanceTimestamp: number // 바이낸스(TIME_STAMP)
}

export interface Orderbook {
  binance: BinanceOrderbook
  upbit: UpbitOrderbook
}

export class Collector {
  #emitter: EventEmitter = new EventEmitter()
  
  #binanceTrades: BinanceTrades = {}
  #binanceOrderbooks: BinanceOrderbooks = {}

  #exchangeRate: number = 0
  
  constructor(emitter: EventEmitter) {
    this.#emitter = emitter
  }


  #handleTrade = (upbitData: UpbitTrade): void => {
    const symbol = upbitData.code.replace('KRW-', '')
    const binanceData = this.#binanceTrades[symbol]

    if(!binanceData || this.#exchangeRate < 1000) return

    const fixedExchangeRate = this.#exchangeRate
    const { price: binanceUSD, eventTime: binanceTimestamp } = binanceData
    const { trade_price: upbitKRW, timestamp: upbitTimestamp } = upbitData

    const upbitUSD = krwToUsd(upbitData.trade_price, fixedExchangeRate)
    const binanceKRW = usdToKrw(binanceData.price, fixedExchangeRate)
    const premium = getPremium(upbitUSD, binanceData.price)

    const payload: Premium = {
      symbol,
      premium,
      upbitUSD,
      upbitKRW,
      binanceUSD,
      binanceKRW,
      exchangeRate: fixedExchangeRate,
      upbitTimestamp,
      binanceTimestamp,
    }
    
    this.#emitter.emit('premium', payload)
  }

  #handleOrderbook = (upbitOrderbook: UpbitOrderbook): void => { //Orderbook은 Front-end에 뿌려주기만 하는 용도 DB저장 안함
    const symbol = upbitOrderbook.code.replace('KRW-', '')
    const binanceOrderbook = this.#binanceOrderbooks[symbol]
    if(!binanceOrderbook) return

    const orderbook: Orderbook = {
      upbit: upbitOrderbook,
      binance: binanceOrderbook
    }

    this.#emitter.emit('orderbook', orderbook)
  }

  #handleError = (error: any) => {
    this.#emitter.emit('error', error)
  }

  #setBinanceTrades = (response: BinanceTrade) => {
    this.#binanceTrades = { ...this.#binanceTrades, [response.symbol.replace('USDT', '')]: response }
  }

  #setBinanceOrderbooks = (response: BinanceOrderbook) => {
    this.#binanceOrderbooks = { ...this.#binanceOrderbooks, [response.symbol.replace('USDT', '')]: response }
  }

  #setExchangeRate = (response: number) => {
    this.#exchangeRate = response
  }
  
  run(): void {
    try {
      const coins: string[] = ['btc']
      const exchangeRateIntervalTimeToSec: number = 10

      const eventBroker = new EventBroker()
      const upbit = new Upbit(coins)
      const binance = new Binance(coins)
      const exchangeRateApp = new ExchangeRate(exchangeRateIntervalTimeToSec)

      eventBroker
        .on(UPBIT_TRADE, this.#handleTrade)
        .on(UPBIT_ORDERBOOK, this.#handleOrderbook)
        .on(BINANCE_TRADE, this.#setBinanceTrades)
        .on(BINANCE_ORDERBOOK, this.#setBinanceOrderbooks)
        .on(EXCHANGE_RATE, this.#setExchangeRate)
        .on('error', this.#handleError)

      eventBroker.subscribe(upbit).subscribe(binance).subscribe(exchangeRateApp)

      upbit.run()
      binance.run()
      exchangeRateApp.run()
      
      upbit.emit()
      binance.emit()
    } catch (error) {
      this.#emitter.emit('error', error)
    }
  }
}