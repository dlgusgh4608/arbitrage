interface ITokens {
  accessKey: string
  secretKey: string
}

interface IAuth {
  apiKey: string
  signature: { [key: string]: any }
}

interface IOriginListenKeyExpired {
  e: 'listenKeyExpired' // Event type
  E: number // Event time
}
interface IListenKeyExpired {
  type: 'listenKeyExpired'
  eventTime: number
}

interface IOrderOrderTradeUpdateDetails {
  s: string;               // Symbol
  c: string;               // Client Order Id
  S: 'BUY' | 'SELL';       // Side
  o: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET'; // Order Type
  f: 'GTC' | 'IOC' | 'FOK'; // Time in Force
  q: string;               // Original Quantity
  p: string;               // Original Price
  ap: string;              // Average Price
  sp: string;              // Stop Price
  x: 'NEW' | 'CANCELED' | 'FILLED' | 'PARTIALLY_FILLED' | 'REJECTED'; // Execution Type
  X: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'EXPIRED'; // Order Status
  i: number;               // Order Id
  l: string;               // Order Last Filled Quantity
  z: string;               // Order Filled Accumulated Quantity
  L: string;               // Last Filled Price
  N?: string;              // Commission Asset
  n?: string;              // Commission
  T: number;               // Order Trade Time
  t: number;               // Trade Id
  b: string;               // Bids Notional
  a: string;               // Ask Notional
  m: boolean;              // Is this trade the maker side?
  R: boolean;              // Is this reduce only
  wt: 'CONTRACT_PRICE' | 'MARKET_PRICE'; // Stop Price Working Type
  ot: 'TRAILING_STOP_MARKET'; // Original Order Type
  ps: 'LONG' | 'SHORT';    // Position Side
  cp: boolean;             // If Close-All, pushed with conditional order
  AP: string;              // Activation Price
  cr: string;              // Callback Rate
  pP: boolean;             // If price protection is turned on
  si: number;              // ignore
  ss: number;              // ignore
  rp: string;              // Realized Profit of the trade
  V: 'EXPIRE_TAKER';       // STP mode
  pm: 'OPPONENT';          // Price match mode
  gtd: number;             // TIF GTD order auto cancel time
}

interface IOriginOrderTradeUpdate {
  e: 'ORDER_TRADE_UPDATE'; // Event Type
  E: number;               // Event Time
  T: number;               // Transaction Time
  o: IOrderOrderTradeUpdateDetails;         // Order details
}

interface IAccountBalance {
  a: string;                  // Asset
  wb: string;                 // Wallet Balance
  cw: string;                 // Cross Wallet Balance
  bc: string;                 // Balance Change except PnL and Commission
}

interface IAccountPosition {
  s: string;                  // Symbol
  pa: string;                 // Position Amount
  ep: string;                 // Entry Price
  bep: string;                // Breakeven price
  cr: string;                 // (Pre-fee) Accumulated Realized
  up: string;                 // Unrealized PnL
  mt: "isolated" | "cross";   // Margin Type
  iw: string;                 // Isolated Wallet (if isolated position)
  ps: "LONG" | "SHORT" | "BOTH"; // Position Side
}

type EventReasonType = 
  'DEPOSIT' |
  'WITHDRAW' |
  'ORDER' |
  'FUNDING_FEE' |
  'WITHDRAW_REJECT' |
  'ADJUSTMENT' |
  'INSURANCE_CLEAR' |
  'ADMIN_DEPOSIT' |
  'ADMIN_WITHDRAW' |
  'MARGIN_TRANSFER' |
  'MARGIN_TYPE_CHANGE' |
  'ASSET_TRANSFER' |
  'OPTIONS_PREMIUM_FEE' |
  'OPTIONS_SETTLE_PROFIT' |
  'AUTO_EXCHANGE' |
  'COIN_SWAP_DEPOSIT' |
  'COIN_SWAP_WITHDRAW'

interface IAccountUpdateData {
  m: EventReasonType;                 // Event reason type
  B: IAccountBalance[];       // Balances
  P: IAccountPosition[];      // Positions
}

interface IOriginAccountUpdate {
  e: "ACCOUNT_UPDATE";  // Event Type
  E: number;           // Event Time
  T: number;           // Transaction
  a: IAccountUpdateData; // Update Data
}

interface IFundingFee {
  asset: string
  fee: number
}

interface IFundingFees {
  eventTime: Date
  fees: IFundingFee[]
}

interface IOrderTrade {
  symbol: string
  side: 'BUY' | 'SELL'
  price: number
  quantity: number
  commission: number
  isMaker: boolean
  eventTime: number
}

export type { BinancePrivateWebsocketType } from './websocket'
export type { BinancePrivateType } from '.'
export type {
  ITokens,
  IAuth,
  IOriginListenKeyExpired,
  IListenKeyExpired,
  IOriginOrderTradeUpdate,
  IOriginAccountUpdate,
  IFundingFees,
  IOrderTrade
}