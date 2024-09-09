import EventEmitter from 'events';
import WebSocket from 'ws'
import dayjs from 'dayjs'

import { UPBIT_ORDERBOOK, UPBIT_TRADE } from '@utils/variables'

const UPBIT_URL = 'wss://api.upbit.com/websocket/v1'

interface ITicketField { ticket: string }
interface ITypeField { type: 'ticker' | 'trade' | 'orderbook'; codes: string[]; }
interface IFormatField { format: 'DEFAULT' | 'SIMPLE' }
type SubscribeMessage = ITicketField | ITypeField | IFormatField

// Orderbook type
interface OrderbookUnit {
  ask_price: number // 매도 가격
  bid_price: number // 매수 가격
  ask_size: number  // 매도 수량
  bid_size: number  // 매수 수량
}

// 전체 주문서를 나타내는 타입
export interface UpbitOrderbook {
  type: "orderbook" // 데이터 타입
  code: string      // 거래 쌍 코드
  timestamp: number // 데이터 수신 시각 (밀리초)
  total_ask_size: number // 전체 매도 수량
  total_bid_size: number // 전체 매수 수량
  orderbook_units: OrderbookUnit[] // 주문서 유닛 배열
  stream_type: "SNAPSHOT" | "REALTIME"
  level: number // 레벨
}

// Trade type
export interface UpbitTrade {
  type: "trade"                   // 데이터 타입
  code: string                    // 거래 쌍 코드
  timestamp: number               // 데이터 수신 시각 (밀리초)
  trade_date: string              // 거래 날짜 (YYYY-MM-DD 형식)
  trade_time: string              // 거래 시간 (HH:MM:SS 형식)
  trade_timestamp: number         // 거래 시각 (밀리초)
  trade_price: number             // 거래 가격
  trade_volume: number            // 거래 수량
  ask_bid: "ASK" | "BID"          // 매도("ASK") 또는 매수("BID")
  prev_closing_price: number      // 이전 종가
  change: "RISE" | "FALL" | "SAME" // 가격 변화 ("RISE": 상승, "FALL": 하락, "SAME": 동일)
  change_price: number            // 가격 변화량
  sequential_id: number           // 순차 ID
  stream_type: "SNAPSHOT" | "REALTIME" // 스트림 타입
}

interface Pong {
  status: 'UP'
}

export class Upbit {
  #ws: WebSocket
  #subscribeMessage: SubscribeMessage[]
  #run: boolean = false

  #orderbook: UpbitOrderbook | undefined
  #trade: UpbitTrade | undefined

  #emitterOut: EventEmitter | undefined
  #emitInterval: number = 500

  constructor(coins: string[], emitInterval = 500) {
    this.#ws = new WebSocket(UPBIT_URL)

    this.#subscribeMessage = [
      { ticket: 'upbitArbitrageTicket' },
      { type: 'trade', codes: coins.map(coin => ['KRW', coin.toUpperCase()].join('-')) },
      { type: 'orderbook', codes: coins.map(coin => ['KRW', coin.toUpperCase()].join('-')) },
      { format: 'DEFAULT' }
    ]

    this.#emitInterval = emitInterval
    this.#run = false
  }

  #handleMessage = (message: Buffer) => {
    try {
      const jsonData: UpbitOrderbook | UpbitTrade | Pong = JSON.parse(message.toString())
      if((jsonData as Pong).status) {
        const pongData = jsonData as Pong

        if(pongData.status !== 'UP') {
          this.close()
        }else {
          this.#ws.send('PING')
        }
      } else {
        if (!(jsonData as UpbitOrderbook | UpbitTrade).type) throw new Error('Received message does not have type')
  
        const data = jsonData as UpbitOrderbook | UpbitTrade

        if (data.type === 'orderbook') { // is orderbook type
          this.#orderbook = data
        } else if(data.type === 'trade') { // is trade type
          this.#trade = data
        } else { // is Error
          throw new Error('Received message type is invalid')
        }
      }
      
    } catch (error) {
      this.#emitterOut?.emit('error', error)
    }
  }

  #receiveMessage() { this.#ws.on('message', this.#handleMessage) }

  #reallocation() {
    this.#ws = new WebSocket(UPBIT_URL)
    this.#run = false
    this.#trade = undefined
    this.#orderbook = undefined
  }

  #open() {
    this.#ws.on('open', () => {
      console.log(`[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')} ]\tUpbit WebSocket Connected`)
      this.#ws.send(JSON.stringify(this.#subscribeMessage))
      this.#ws.send('PING')
    })
  }

  close() { this.#ws.close() }

  bind(emitter = new EventEmitter()) { this.#emitterOut = emitter }

  emit() {
    setInterval(() => {
      if(this.#emitterOut) {
        if(this.#trade) this.#emitterOut.emit(UPBIT_TRADE, Object.freeze(this.#trade))
        if(this.#orderbook) this.#emitterOut.emit(UPBIT_ORDERBOOK, Object.freeze(this.#orderbook))
      }
    }, this.#emitInterval)
  }

  run(restart: boolean = true) {
    try {
      if (this.#run) throw new Error('This socket is already running!')
      this.#run = true
  
      this.#ws.on('close', () => {
        console.log(`Upbit WebSocket Disconnected`)
        this.#reallocation()

        if(restart) this.run(restart)
      })

      this.#receiveMessage()
  
      this.#open()
    } catch (error) {
      throw error
    }
  }
}
