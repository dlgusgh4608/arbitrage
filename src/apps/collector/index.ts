import EventEmitter from 'events'
import {
  Binance,
  BinanceOrderbook,
  BinanceTrade,
} from './binance'

import { ExchangeRate } from './exchange-rate'
import {
  Upbit,
  UpbitOrderbook,
  UpbitTrade,
} from './upbit'

import {
  BINANCE_ORDERBOOK,
  BINANCE_TRADE,
  UPBIT_ORDERBOOK,
  UPBIT_TRADE,
  EXCHANGE_RATE
} from '@libs/variables'

import { krwToUsd, getPremium } from '@libs'

import { EventBroker } from '@modules/event-broker'

interface BinanceTrades { [symbol: string]: BinanceTrade }
interface BinanceOrderbooks { [symbol: string]: BinanceOrderbook }

export class Collector {
  #emitter: EventEmitter = new EventEmitter()
  constructor(emitter: EventEmitter) {
    this.#emitter = emitter
  }

  run(): void {
    try {
      const coins: string[] = ['btc']
      const exchangeRateIntervalTimeToSec: number = 10

      const eventBroker = new EventBroker()
      const upbit = new Upbit(coins)
      const binance = new Binance(coins)
      const exchangeRateApp = new ExchangeRate(exchangeRateIntervalTimeToSec)

      let binanceTrades: BinanceTrades = {}
      let binanceOrderbooks: BinanceOrderbooks = {}
      let exchangeRate: number = 0

      eventBroker
        .on(UPBIT_TRADE, (upbitData: UpbitTrade) => {
          const symbol = upbitData.code.replace('KRW-', '')
          const binanceData = binanceTrades[symbol]

          if(!binanceData || exchangeRate < 1000) return

          const upbitUsdPrice = krwToUsd(upbitData.trade_price, exchangeRate)
          const premium = getPremium(upbitUsdPrice, binanceData.price)

          console.log({
            upbitUsdPrice,
            binanceUsd: binanceData.price,
            premium,
            exchangeRate
          })

        })
        .on(UPBIT_ORDERBOOK, (response: UpbitOrderbook) => {
          
        })
        .on(BINANCE_TRADE, (response: BinanceTrade) => {
          binanceTrades = { ...binanceTrades, [response.symbol.replace('USDT', '')]: response }
        })
        .on(BINANCE_ORDERBOOK, (response: BinanceOrderbook) => {
          binanceOrderbooks = { ...binanceOrderbooks, [response.symbol.replace('USDT', '')]: response }
        })
        .on(EXCHANGE_RATE, (response: number) => {
          exchangeRate = response
        })
        .on('error', obj => {
          // error data
        })

      

      eventBroker.subscribe(upbit).subscribe(binance).subscribe(exchangeRateApp)

      upbit.run()
      binance.run()
      exchangeRateApp.run()
      
      upbit.emit()
      binance.emit()
    } catch (error) {
      throw error
    }
  }
}

// async function main() {
//   try {
//     const coins: string[] = ['btc']
//     const exchangeRateIntervalTimeToSec: number = 10

//     const eventBroker = new EventBroker()
//     const upbit = new Upbit(coins)
//     const binance = new Binance(coins)
//     const exchangeRateApp = new ExchangeRate(exchangeRateIntervalTimeToSec)

//     let binanceTrades: BinanceTrades = {}
//     let binanceOrderbooks: BinanceOrderbooks = {}
//     let exchangeRate: number = 0

//     eventBroker
//       .on(UPBIT_TRADE, (upbitData: UpbitTrade) => {
//         const symbol = upbitData.code.replace('KRW-', '')
//         const binanceData = binanceTrades[symbol]

//         if(!binanceData || exchangeRate < 1000) return

//         const upbitUsdPrice = krwToUsd(upbitData.trade_price, exchangeRate)
//         const premium = getPremium(upbitUsdPrice, binanceData.price)

//         console.log({
//           upbitUsdPrice,
//           binanceUsd: binanceData.price,
//           premium,
//           exchangeRate
//         })

//       })
//       .on(UPBIT_ORDERBOOK, (response: UpbitOrderbook) => {
        
//       })
//       .on(BINANCE_TRADE, (response: BinanceTrade) => {
//         binanceTrades = { ...binanceTrades, [response.symbol.replace('USDT', '')]: response }
//       })
//       .on(BINANCE_ORDERBOOK, (response: BinanceOrderbook) => {
//         binanceOrderbooks = { ...binanceOrderbooks, [response.symbol.replace('USDT', '')]: response }
//       })
//       .on(EXCHANGE_RATE, (response: number) => {
//         exchangeRate = response
//       })
//       .on('error', obj => {
//         // error data
//       })

    

//     eventBroker.subscribe(upbit).subscribe(binance).subscribe(exchangeRateApp)

//     upbit.run()
//     binance.run()
//     exchangeRateApp.run()
    
//     upbit.emit()
//     binance.emit()

//   } catch (error) {
//     console.error(error)
//   }
// }

// main()