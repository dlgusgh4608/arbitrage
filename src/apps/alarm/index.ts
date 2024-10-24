import dayjs from 'dayjs'
import { Telegram } from '@modules/telegram'

import type { IUserTradeWithEnv, ISellOrderCreatePayload, IBuyOrderCreatePayload } from '@models/types'
import type { EventBrokerType } from '@modules/event-broker'
import type { IFundingFees } from '@modules/binance/private/types'

interface ISellPayload extends ISellOrderCreatePayload {
  symbol: string
  user_id: number
  profit: number
}

interface IBuyPayload extends IBuyOrderCreatePayload {
  symbol: string
}

interface IFundingFee extends IFundingFees {
  user_id: number
}

const BUY = 'buy'
const SELL = 'sell'
const FUNDING_FEE = 'fundingFee'
export class Alarm extends Telegram {
  private emitter: EventBrokerType
  
  constructor(userInfos:IUserTradeWithEnv[], emitter: EventBrokerType) {
    super(userInfos)
    this.emitter = emitter
  }

  private handleBuy(payload: IBuyPayload) {
    const message = [
      `[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')}: 구매(${payload.symbol}) ]`,
      `프리미엄: ${payload.premium}`,
      `기준환율: ${payload.usd_to_krw}`,
      ``,
      `국내가격: ${payload.domestic_price}KRW`,
      `국내개수: ${payload.domestic_quantity}개`,
      ``,
      `해외가격: ${payload.overseas_price}USDT`,
      `해외개수: ${payload.overseas_quantity}개`,
      ``,
      `거래속성: ${payload.is_maker ? 'MAKER' : 'TAKER'}`,
    ].join(`\n`)

    this.sendMessageByUserId(payload.user_id, message)
  }

  private handleSell(payload: ISellPayload) {
    const message = [
      `[ ${dayjs().format('YYYY-MM-DD HH:mm:ss')}: 판매(${payload.symbol}) ]`,
      `수 익 률: ${payload.profit_rate}`,
      `순수익률: ${payload.net_profit_rate}`,
      `수 익 금: ${payload.profit}`,
      ``,
      `프리미엄: ${payload.premium}`,
      `기준환율: ${payload.usd_to_krw}`,
      ``,
      `국내가격: ${payload.domestic_price}KRW`,
      `국내개수: ${payload.domestic_quantity}개`,
      ``,
      `해외가격: ${payload.overseas_price}USDT`,
      `해외개수: ${payload.overseas_quantity}개`,
      ``,
      `거래속성: ${payload.is_maker ? 'MAKER' : 'TAKER'}`,
    ].join(`\n`)

    this.sendMessageByUserId(payload.user_id, message)
  }

  private handleFundingFee(payload: IFundingFee) {
    const messageToArray = [
      `[ ${dayjs(payload.eventTime).format('YYYY-MM-DD HH:mm:ss')}: 펀딩피 ]`,
      ``,
    ]
    payload.fees.forEach(fee => messageToArray.push(String(fee.fee).concat(fee.asset)))

    this.sendMessageByUserId(payload.user_id, messageToArray.join(`\n`))
  }
  
  public run() {
    this.emitter
      .on(BUY, this.handleBuy)
      .on(SELL, this.handleSell)
      .on(FUNDING_FEE, this.handleFundingFee)
  }
}