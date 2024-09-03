import EventEmitter from 'events'
import WebSocket from 'ws'

const UPBIT_URL = 'wss://api.upbit.com/websocket/v1'

// SubscribeMessage type
interface ITicketField { ticket: string }
interface ITypeField { type: 'ticker' | 'trade' | 'orderbook'; codes: string[]; }
interface IFormatField { format: 'DEFAULT' | 'SIMPLE' }
type SubscribeMessage = ITicketField | ITypeField | IFormatField

// Orderbook type
interface OrderbookUnit {
  ask_price: number; // 매도 가격
  bid_price: number; // 매수 가격
  ask_size: number;  // 매도 수량
  bid_size: number;  // 매수 수량
}
// 전체 주문서를 나타내는 타입
interface Orderbook {
  type: "orderbook"; // 데이터 타입
  code: string;      // 거래 쌍 코드
  timestamp: number; // 데이터 수신 시각 (밀리초)
  total_ask_size: number; // 전체 매도 수량
  total_bid_size: number; // 전체 매수 수량
  orderbook_units: OrderbookUnit[]; // 주문서 유닛 배열
  stream_type: "REALTIME"; // 스트림 타입
  level: number; // 레벨
}

// Trade type
interface Trade {
  type: "trade";                   // 데이터 타입
  code: string;                    // 거래 쌍 코드
  timestamp: number;               // 데이터 수신 시각 (밀리초)
  trade_date: string;              // 거래 날짜 (YYYY-MM-DD 형식)
  trade_time: string;              // 거래 시간 (HH:MM:SS 형식)
  trade_timestamp: number;         // 거래 시각 (밀리초)
  trade_price: number;             // 거래 가격
  trade_volume: number;            // 거래 수량
  ask_bid: "ASK" | "BID";          // 매도("ASK") 또는 매수("BID")
  prev_closing_price: number;      // 이전 종가
  change: "RISE" | "FALL" | "SAME"; // 가격 변화 ("RISE": 상승, "FALL": 하락, "SAME": 동일)
  change_price: number;            // 가격 변화량
  sequential_id: number;           // 순차 ID
  stream_type: "SNAPSHOT";         // 스트림 타입
}

class Upbit {
  #ws: WebSocket
  #subscribeMessage: SubscribeMessage[]
  #run: Boolean = false

  #orderbook: Orderbook | undefined
  #trade: Trade | undefined

  constructor(subscribeMessage: SubscribeMessage[]) {
    const ws = new WebSocket(UPBIT_URL)
    this.#subscribeMessage = subscribeMessage

    this.#ws = ws

    return this
  }

  #receiveMessage(message: WebSocket.MessageEvent) {
    try {
      const jsonData: Orderbook | Trade = JSON.parse(message.toString())
      if(!jsonData?.type) return new Error('receive message do not have type')
      if(!(jsonData.type === 'orderbook' || jsonData.type === 'trade')) return new Error('receive message type is invalid')

      if(jsonData.type === 'orderbook') { // is orderbook type
        this.#orderbook = jsonData
      }else { // is trade type
        this.#trade = jsonData
      }
    } catch (error) {
      throw error
    }
  }

  run() {
    if(this.#run) return new Error('this socket is running!')
    this.#run = true

    this.#ws.on('message', this.#receiveMessage)
    
    this.#ws.on('open', () => {
      this.#ws.send(JSON.stringify(this.#subscribeMessage))
    })

  }
}

export type { SubscribeMessage }

export default Upbit