import { UpbitPublic } from '@modules/upbit'
import { BinancePublic } from '@modules/binance'

import { krwToUsd, getPremium, getTimeDifference } from '@utils'
import { USD_TO_KRW } from '@utils/constants'

import { SymbolWithExchange } from '@models/types'

import dayjs from 'dayjs'

import type { EventBroker } from '@modules/event-broker'
import type { UpbitTrade, UpbitOrderbook, UpbitPublicWebsocketType } from '@modules/upbit'
import type { BinancePublicWebsocketType, BinanceTrade, BinanceOrderbook } from '@modules/binance'
import type { Premium, Orderbook } from './types'

const TIME_DIFFERENCE_LIMIT_SEC = 60
const PREMIUM_INTERVAL_TIME_TO_SEC = 100
const UPBIT_UNIQUE_SYMBOL = 'ConnectUpbitSocketForCollector'

export class Collector {
  private emitter!: EventBroker

  private symbols: SymbolWithExchange[] = []

  private upbit?: UpbitPublicWebsocketType
  private binance?: BinancePublicWebsocketType
  private usdToKrw: number = 0
  
  constructor(emitter: EventBroker, symbols: SymbolWithExchange[]) {
    this.emitter = emitter
    this.symbols = symbols

    this.emitter.on(USD_TO_KRW, this.setUsdToKrw)
  }

  private setUsdToKrw = (response: number) => { this.usdToKrw = response }

  private publishPremium = () => {
    if(!this.upbit) return
    if(!this.binance) return
    if(this.usdToKrw < 1000) return
    
    for(const symbol of this.symbols) {
      const { name, domestic, overseas } = symbol
      const key = [name, domestic, overseas, 'trade'].join('-')
      const upbitData = this.upbit.get('trade', name) as UpbitTrade
      const binanceData = this.binance.get('trade', name) as BinanceTrade

      if(!upbitData || !binanceData) continue

      const upbitLastTradeTime = dayjs(upbitData.trade_timestamp).toDate()
      const binanceLastTradeTime = dayjs(binanceData.tradeTime).toDate()

      if(Math.abs(getTimeDifference(upbitLastTradeTime, binanceLastTradeTime)) > TIME_DIFFERENCE_LIMIT_SEC) {
        console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]:${key}\tTime difference between upbit and binance is more than ${TIME_DIFFERENCE_LIMIT_SEC} seconds`)
        this.emitter.emit('error', `time difference between upbit and binance is more than ${TIME_DIFFERENCE_LIMIT_SEC} seconds`)
        
        continue
      }

      const fixedUsdToKrw = this.usdToKrw
      const { price: binancePrice } = binanceData
      const { trade_price: upbitPrice } = upbitData

      const upbitUSD = krwToUsd(upbitData.trade_price, fixedUsdToKrw)
      const premium = getPremium(upbitUSD, binanceData.price)
      
      const payload: Premium = {
        symbol: name,
        premium,
        domestic: upbitPrice,
        overseas: binancePrice,
        usdToKrw: fixedUsdToKrw,
        domesticTradeAt: upbitLastTradeTime,
        overseasTradeAt: binanceLastTradeTime
      }
      
      this.emitter.emit(key, payload)
    }
  }

  private publishOrderbook = () => {
    if(!this.upbit) return
    if(!this.binance) return

    for(const symbol of this.symbols) {
      const { name, domestic, overseas } = symbol
      const upbitData = this.upbit.get('orderbook', name) as UpbitOrderbook
      const binanceData = this.binance.get('orderbook', name) as BinanceOrderbook
      
      this.emitter.emit(
        [symbol, domestic, overseas, 'orderbook'].join('-'),
        {
          upbit: upbitData,
          binance: binanceData,
        }
      )
    } 
  }

  private publish = () => {
    this.publishPremium()
    this.publishOrderbook()
  }
  
  run(): void {
    try {
      const symbolNames = this.symbols.map(symbol => symbol.name)
      // PostgreSQL에 Symbols table이 비어있으면 에러 발생
      if(symbolNames.length === 0) throw new Error('symbolNames is empty')
        
      // 각 class를 생성
      const upbit = new UpbitPublic().websocket(symbolNames, UPBIT_UNIQUE_SYMBOL)
      const binance = new BinancePublic().websocket(symbolNames)

      // 각 class 실행
      upbit.run()
      binance.run()

      // 각 class 저장
      this.upbit = upbit
      this.binance = binance

      // publish premium and orderbook
      setInterval(this.publish, PREMIUM_INTERVAL_TIME_TO_SEC)
    } catch (error) {
      this.emitter.emit('error', error)
    }
  }
}