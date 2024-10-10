import WebSocket from 'ws'
import dayjs from 'dayjs'

const UPBIT_URL = 'wss://api.upbit.com/websocket/v1'

interface ITicketField { ticket: string }
interface ITypeField { type: 'ticker' | 'trade' | 'orderbook'; codes: string[]; }
interface IFormatField { format: 'DEFAULT' | 'SIMPLE' }
type SubscribeMessage = ITicketField | ITypeField | IFormatField

import type { UpbitTrade, UpbitOrderbook } from '../types'

interface Pong {
  status: 'UP'
}

export class UpbitPublicWebsocket {
  private ws: WebSocket
  private subscribeMessage: SubscribeMessage[]
  private running: boolean = false

  private orderbook: { [key: string]: UpbitOrderbook } = {}
  private trade: { [key: string]: UpbitTrade } = {}
  private errors: Error[] = []

  constructor(coins: string[], uniqueTicket: string) {
    this.ws = new WebSocket(UPBIT_URL)

    this.subscribeMessage = [
      { ticket: uniqueTicket },
      { type: 'trade', codes: coins.map(coin => ['KRW', coin.toUpperCase()].join('-')) },
      { type: 'orderbook', codes: coins.map(coin => ['KRW', coin.toUpperCase()].join('-')) },
      { format: 'DEFAULT' }
    ]

    this.running = false
  }

  private handleMessage = (message: Buffer) => {
    try {
      const jsonData: UpbitOrderbook | UpbitTrade | Pong = JSON.parse(message.toString())
      if((jsonData as Pong).status) {
        const pongData = jsonData as Pong

        if(pongData.status !== 'UP') {
          this.close()
        }else {
          this.ws.send('PING')
        }
      } else {
        if (!(jsonData as UpbitOrderbook | UpbitTrade).type) throw new Error('Received message does not have type')
  
        const data = jsonData as UpbitOrderbook | UpbitTrade

        if (data.type === 'orderbook') { // is orderbook type
          this.set('orderbook', data)
        } else if(data.type === 'trade') { // is trade type
          this.set('trade', data)
        } else { // is Error
          throw new Error('Received message type is invalid')
        }
      }
      
    } catch (error) {
      this.errors.push(error as Error)
    }
  }

  private receiveMessage() { this.ws.on('message', this.handleMessage) }

  private reallocation() {
    this.ws = new WebSocket(UPBIT_URL)
    this.running = false
  }

  private open() {
    this.ws.on('open', () => {
      console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tUpbit WebSocket Connected`)
      this.ws.send(JSON.stringify(this.subscribeMessage))
      this.ws.send('PING')
    })
  }

  close() { this.ws.close() }

  private set(type: 'orderbook' | 'trade', data: UpbitOrderbook | UpbitTrade) {
    const key = data.code.replace('KRW-', '').toLowerCase()
    if(type === 'orderbook') {
      this.orderbook[key] = data as UpbitOrderbook
    } else if(type === 'trade') {
      this.trade[key] = data as UpbitTrade
    }
  }

  get(type: 'orderbook' | 'trade', code: string) {
    if(type === 'orderbook') {
      return this.orderbook[code]
    } else if(type === 'trade') {
      return this.trade[code]
    }
  }

  run(restart: boolean = true) {
    try {
      if (this.running) throw new Error('This socket is already running!')
      this.running = true
  
      this.ws.on('close', () => {
        console.log(`Upbit WebSocket Disconnected`)
        this.reallocation()

        if(restart) this.run(restart)
      })

      this.receiveMessage()
  
      this.open()
    } catch (error) {
      throw error
    }
  }
}

export type UpbitPublicWebsocketType = InstanceType<typeof UpbitPublicWebsocket>