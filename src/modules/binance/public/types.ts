interface TradeOriginal {
  e: "aggTrade"    // Event type, which is a literal type
  E: number        // Event time, which is a number
  s: string        // Symbol, which is a string
  a: number        // Aggregate trade ID, which is a number
  p: string        // Price, which is a string
  q: string        // Quantity, which is a string
  f: number        // First trade ID, which is a number
  l: number        // Last trade ID, which is a number
  T: number        // Trade time, which is a number
  m: boolean        // Is the buyer the market maker?, which is a boolean
}
interface BinanceTrade {
  type: "aggTrade";
  eventTime: number;
  symbol: string;
  aggregateTradeId: number;
  price: number;
  quantity: number;
  firstTradeId: number;
  lastTradeId: number;
  tradeTime: number;
  isMarketMaker: boolean;
}
interface OrderbookOriginal {
  e: "depthUpdate";   // Event type, which is a literal type
  E: number;         // Event time, which is a number
  T: number;         // Transaction time, which is a number
  s: string;         // Symbol, which is a string
  U: number;         // First update ID, which is a number
  u: number;         // Final update ID, which is a number
  pu: number;        // Previous update ID, which is a number
  b: [string, string][]; // Bids to be updated, an array of arrays with string values
  a: [string, string][]; // Asks to be updated, an array of arrays with string values
}
interface Order {
  price: number,
  quantity: number
}
interface BinanceOrderbook {
  type: "depthUpdate";
  eventTime: number;
  transactionTime: number;
  symbol: string;
  firstUpdateID: number;
  finalUpdateID: number;
  previousUpdateID: number;
  bids: Order[];
  asks: Order[];
}

export type { BinancePublicType } from '.'
export type { BinanceTrade, BinanceOrderbook, TradeOriginal, OrderbookOriginal }
export type { BinancePublicWebsocketType } from './websocket'