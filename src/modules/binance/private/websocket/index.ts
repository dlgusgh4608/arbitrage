import { WebSocket } from 'ws'
import EventEmitter from 'events'

import { BinancePrivateWebsocketHandler } from './handler'

import type {
  BinancePrivateType,
  IOriginOrderTradeUpdate,
  IOriginListenKeyExpired,
  IOriginAccountUpdate,
  IOrderTrade,
  IFundingFees
} from '../types'

const BASE_URL = 'wss://fstream.binance.com/ws'

const LISTEN_KEY_ALIVE_INTERVAL = 45 * 60 * 1000 // 45 minutes
const RECONNECT_TIMEOUT = 3 * 1000

export class BinancePrivateWebsocket extends BinancePrivateWebsocketHandler {
  private websocket?: WebSocket
  private socketUrl: string = BASE_URL
  private isRunning: boolean = false
  private listenKey: string = ''

  private readonly binancePrivate: BinancePrivateType
  private readonly reconnect: boolean

  
  private emitterOut?: EventEmitter

  private readonly websocketHandler: {
    onOpen: () => void
    onError: (error: Error) => void
    onClose: () => void
    onMessage: (data: string) => void
  } = {
    onOpen: () => {
      console.log(`binance private websocket connected: "${this.socketUrl}"`)

      setInterval(async () => {
        try {
          await this.binancePrivate.listenKey().update(this.listenKey)
          console.log(`binance private websocket listen key keep alive! listenKey: ${this.listenKey}`)
        } catch (error) {
          throw error
        }
      }, LISTEN_KEY_ALIVE_INTERVAL)      
    },
    onError: (error: Error) => {
      console.error(error)
    },
    onClose: () => {
      console.log('binance private websocket closed')

      if(this.reconnect) {
        setTimeout(() => {
          console.log('binance private websocket reconnecting!')
          this.connect()
        }, RECONNECT_TIMEOUT)
      }
    },
    onMessage: (strData: string) => {
      const data: IOriginAccountUpdate | IOriginOrderTradeUpdate | IOriginListenKeyExpired = JSON.parse(strData)

      const eventType = data.e

      switch(eventType) {
        case 'ACCOUNT_UPDATE':
          this.handleAccountUpdate(data)
          break
        case 'ORDER_TRADE_UPDATE':
          this.switchOrderTrade(data)
          break
        case 'listenKeyExpired':
          this.handleListenKeyExpired()
          break
        default: 
          break
      }
    },
  }
  
  constructor(binancePrivate: BinancePrivateType, reconnect: boolean = true) {
    super()
    this.binancePrivate = binancePrivate
    this.reconnect = reconnect
  }
  
  private onInnerEmitterOfTypes() {
    if(!this.emitterOut) throw new Error('bind first!')
    
    this
      .on(this.types.listenKeyExpired, () => this.close())
      .on(this.types.fundingFee, (data: IFundingFees) => this.emitterOut!.emit(this.types.fundingFee, data))
      .on(this.types.sell, (data: IOrderTrade) => this.emitterOut!.emit(this.types.sell, data))
      .on(this.types.buy, (data: IOrderTrade) => this.emitterOut!.emit(this.types.buy, data))
  }

  private async getListenKey(): Promise<string> {
    const listenKey = await this.binancePrivate.listenKey().get()
    return listenKey
  }
  
  private async setSocketUrl() {
    try {
      const listenKey = await this.getListenKey()

      this.listenKey = listenKey
      this.socketUrl = [BASE_URL, listenKey].join('/')
    } catch (error) {
      throw error
    }
  }

  private async connect(): Promise<void> {
    try {
      await this.setSocketUrl()

      const websocket = new WebSocket(this.socketUrl)

      websocket
        .on('open', () => this.websocketHandler.onOpen())
        .on('close', () => this.websocketHandler.onClose())
        .on('error', (error) => this.websocketHandler.onError(error))
        .on('message', (data) => this.websocketHandler.onMessage(JSON.parse(data.toString())))

      this.websocket = websocket
    } catch (error) {
      throw error
    }
  }

  public close() {
    if(!this.websocket) throw new Error('websocket is not connected')

      this.websocket.close()

      this.websocket = undefined
      this.isRunning = false
  }
  
  public async run() {
    try {
      if(this.isRunning) throw new Error('already running')
      this.isRunning = true

      this.onInnerEmitterOfTypes()
      await this.connect()
    } catch (error) {
      throw error
    }
  }

  bind(emitter: EventEmitter = new EventEmitter()) { this.emitterOut = emitter }
}

export type BinancePrivateWebsocketType = InstanceType<typeof BinancePrivateWebsocket>