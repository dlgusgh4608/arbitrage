import type { UpbitPrivateType } from '.'
import type { OrderType } from './rest/order'

interface ITokens {
  accessKey: string
  secretKey: string
}

interface IAuth {
  Authorization: string,
  qs: string
}

interface IOrderPost {
  symbol: string
  side: 'bid' | 'ask' // 매수 | 매도
  volume?: number
  price?: number
  ord_type?: 'limit' | 'price' | 'market' // 지정가 | 시장가(매수) | 시장가(매도)
}

interface ITrade {
  market: string;
  uuid: string;
  price: string;
  volume: string;
  funds: string;
  trend: string;
  created_at: string;
  side: string;
}

interface IOrder {
  uuid: string;
  side: string;
  ord_type: string;
  price: string;
  state: 'wait' | 'watch' | 'done' | 'cancel';
  market: string;
  created_at: string;
  reserved_fee: string;
  remaining_fee: string;
  paid_fee: string;
  locked: string;
  executed_volume: string;
  trades_count: number;
  trades: ITrade[];
}

interface IWallet {
  currency: string;                     // 화폐를 의미하는 영문 대문자 코드
  balance: string;                      // 주문가능 금액/수량
  locked: string;                       // 주문 중 묶여있는 금액/수량
  avg_buy_price: string;                // 매수평균가
  avg_buy_price_modified: boolean;      // 매수평균가 수정 여부
  unit_currency?: string;               // 단위 화폐 (optional)
}

export type {
  ITokens,
  IAuth,
  IOrderPost,
  IOrder,
  UpbitPrivateType,
  OrderType,
  IWallet
}