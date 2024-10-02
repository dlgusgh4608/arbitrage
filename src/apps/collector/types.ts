import type { UpbitOrderbook } from '@modules/upbit'
import type { BinanceOrderbook } from '@modules/binance/public/types'

interface Premium {
  symbol: string // 심볼: BTC, ETH
  premium: number // 김프
  domestic: number // 업비트(KRW)
  overseas: number // 바이낸스(USD)
  usdToKrw: number // 환율
  domesticTradeAt: Date // 국내 체결 시간
  overseasTradeAt: Date // 해외 체결 시간
}

interface Orderbook {
  binance: BinanceOrderbook
  upbit: UpbitOrderbook
}

export type { Premium, Orderbook }
