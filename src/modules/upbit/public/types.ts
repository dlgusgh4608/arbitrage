interface UpbitTrade {
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

interface OrderbookUnit {
  ask_price: number // 매도 가격
  bid_price: number // 매수 가격
  ask_size: number  // 매도 수량
  bid_size: number  // 매수 수량
}

interface UpbitOrderbook {
  type: "orderbook" // 데이터 타입
  code: string      // 거래 쌍 코드
  timestamp: number // 데이터 수신 시각 (밀리초)
  total_ask_size: number // 전체 매도 수량
  total_bid_size: number // 전체 매수 수량
  orderbook_units: OrderbookUnit[] // 주문서 유닛 배열
  stream_type: "SNAPSHOT" | "REALTIME"
  level: number // 레벨
}

export type { UpbitPublicWebsocketType } from './websocket'
export type { UpbitPublicType } from '.'
export type { UpbitTrade, UpbitOrderbook }