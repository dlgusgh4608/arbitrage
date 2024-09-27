import WebSocket from "ws";
import dayjs from "dayjs";

const BINANCE_URL: string = 'wss://fstream.binance.com/stream?streams=' // example "wss://fstream.binance.com/stream?streams=bnbusdt@aggTrade/btcusdt@markPrice"

import type { BinanceTrade, BinanceOrderbook, TradeOriginal, OrderbookOriginal } from '../types'

export class BinancePublicWebsocket {
  #ws: WebSocket
  #run: boolean = false
  #url: string = ''
  #orderbook: { [key: string]: BinanceOrderbook } = {}
  #trade: { [key: string]: BinanceTrade } = {}

  constructor(coins: string[]) {
    const streamParams: string = [
      ...coins.map(coin => [coin.toLowerCase().concat('usdt'), 'aggTrade'].join('@')),
      ...coins.map(coin => [coin.toLowerCase().concat('usdt'), 'depth10@100ms'].join('@')),
    ].join('/')

    const url: string = BINANCE_URL.concat(streamParams)
    
    this.#url = url

    this.#ws = new WebSocket(url)
  }

  #open() {
    this.#ws.on('open', () => {
      console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tBinance WebSocket Connected`)
    })
  }

  #transformAggTrade(original: TradeOriginal): BinanceTrade {
    return {
      type: original.e,
      eventTime: original.E,
      symbol: original.s,
      aggregateTradeId: original.a,
      price: Number(original.p),
      quantity: Number(original.q),
      firstTradeId: original.f,
      lastTradeId: original.l,
      tradeTime: original.T,
      isMarketMaker: original.m
    };
  }

  #transformOrderbook(original: OrderbookOriginal): BinanceOrderbook {
    return {
      type: original.e,
      eventTime: original.E,
      transactionTime: original.T,
      symbol: original.s,
      firstUpdateID: original.U,
      finalUpdateID: original.u,
      previousUpdateID: original.pu,
      bids: original.b.map(([price, quantity]) => ({ price: Number(price), quantity: Number(quantity) })),
      asks: original.a.map(([price, quantity]) => ({ price: Number(price), quantity: Number(quantity) }))
    };
  }

  #handleMessage = (message: Buffer) => {
    try {
      const jsonData: TradeOriginal | OrderbookOriginal = JSON.parse(message.toString()).data

      if(jsonData.e === 'aggTrade') {
        this.#set('trade', this.#transformAggTrade(jsonData))
      }else if(jsonData.e === 'depthUpdate') {
        this.#set('orderbook', this.#transformOrderbook(jsonData))
      }else {
        throw new Error('Received message type is invalid')
      }
    } catch (error) {
      console.error(error)
    }
  }

  #receiveMessage() { this.#ws.on('message', this.#handleMessage) }

  #reallocation() {
    this.#ws = new WebSocket(this.#url)
    this.#run = false
  }

  #ping() {
    this.#ws.on('ping', (e: Buffer) => {
      this.#ws.pong()
    })
  }

  #set(type: 'orderbook' | 'trade', data: BinanceOrderbook | BinanceTrade) {
    const key = data.symbol.replace('USDT', '').toLowerCase()
    if(type === 'orderbook') {
      this.#orderbook[key] = data as BinanceOrderbook
    } else if(type === 'trade') {
      this.#trade[key] = data as BinanceTrade
    }
  }

  get(type: 'orderbook' | 'trade', symbol: string) {
    if(type === 'orderbook') {
      return this.#orderbook[symbol]
    } else if(type === 'trade') {
      return this.#trade[symbol]
    }
  }

  close() { this.#ws.close() }

  run(restart: boolean = true) {
    try {
      if (this.#run) throw new Error('This socket is already running!')
      this.#run = true

      this.#receiveMessage()

      this.#ping()

      this.#ws.on('close', () => {
        console.log('Binance WebSocket Disconnected')
        this.#reallocation()

        if(restart) this.run(restart)
      })

      this.#open()
    } catch (error) {
      throw error
    }
  }
}

export type BinancePublicWebsocketType = InstanceType<typeof BinancePublicWebsocket>