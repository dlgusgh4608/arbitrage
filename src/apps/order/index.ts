import dayjs from 'dayjs'

import { BinancePrivate } from '@modules/binance/private'
import { UpbitPrivate } from '@modules/upbit/private'
import { EventBroker } from '@modules/event-broker'

import { usdToKrw, round8, getPremium } from '@utils'
import { USD_TO_KRW, BINANCE_FUNDING_FEE, BINANCE_SELL, BINANCE_BUY } from '@utils/constants'
import { Order, OrderDetail } from '@models'

import type { IUserTradeWithEnv } from '@models/types'
import type { UpbitPrivateType } from '@modules/upbit/private/types'
import type { BinancePrivateType, IOrderTrade } from '@modules/binance/private/types'


class OrderClass {
  private emitterOut!: EventBroker
  private emitterIn!: EventBroker
  private userInfo: IUserTradeWithEnv
  private overseasPrivate!: BinancePrivateType
  private domesticPrivate!: UpbitPrivateType

  private usdToKrw: number = 0

  constructor(
    emitter: EventBroker,
    userInfo: IUserTradeWithEnv
  ) {
    this.emitterOut = emitter
    this.emitterIn = new EventBroker()
    this.userInfo = userInfo
    const userEnv = userInfo.user_env

    const domesticPrivate = new UpbitPrivate({ accessKey: userEnv.domestic_access_key, secretKey: userEnv.domestic_secret_key })
    const overseasPrivate = new BinancePrivate({ accessKey: userEnv.overseas_access_key, secretKey: userEnv.overseas_secret_key })
    this.domesticPrivate = domesticPrivate
    this.overseasPrivate = overseasPrivate

    this.emitterOut.on(USD_TO_KRW, this.setUsdToKrw)
  }

  private setUsdToKrw = (response: number) => { this.usdToKrw = response }

  private async handleSell(data: IOrderTrade) {
    try {
      // overseas에서 sell주문(short)이 발생하면 domestic에서는 buy주문(long)으로 헷징을 해야한다.
      // domestic(upbit)에서는 시장가 매수는 가격을 입력함.

      const order = this.domesticPrivate.order() // upbit 주문 모듈

      // upbit 주문 시작
      const side = 'bid'
      const ord_type = 'price'
      const fixedUsdToKrw = this.usdToKrw
      const price = usdToKrw(data.price * data.quantity, fixedUsdToKrw)
      const uuid = await order.post({ symbol: data.symbol, side, ord_type, price })
      const orderData = await order.get(uuid)
      // upbit 주문 종료
      
      const {
        price: domestic_price, // <- 평단가
        executed_volume: domestic_quantity,
        paid_fee: domestic_commission,
        created_at: domestic_trade_at,
      } = orderData
      
      // PostgreSQL insert start
      const { id: orderId } = await Order.Exec.create({ user_id: this.userInfo.id, symbol_id: this.userInfo.symbol_id })
      
      const response = await OrderDetail.Exec.create({
        status: 'buy',
        order_id: orderId,
        premium: getPremium(Number(domestic_price) * Number(domestic_quantity), price),
        domestic_price: Number(domestic_price),
        domestic_quantity: Number(domestic_quantity),
        domestic_commission: Number(domestic_commission),
        overseas_price: data.price,
        overseas_quantity: data.quantity,
        overseas_commission: data.commission,
        usd_to_krw: fixedUsdToKrw,
        is_maker: data.isMaker,
        domestic_trade_at: dayjs(domestic_trade_at).toDate(),
        overseas_trade_at: dayjs(data.eventTime).toDate()
      })

      this.emitterOut.emit('alarmApp', response) // 미완성
    } catch (error) {
      throw error
    }
  }

  private async handleBuy(data: IOrderTrade) {
    try {
      // overseas에서 buy주문(long)이 발생하면 domestic에서는 sell주문(short)을 정해진 개수대로 하면 된다.
      // domestic(upbit)에서는 시장가 매도는 수량을 입력함.
    } catch (error) {
      throw error
    }
  }
  
  private onOverseasEmit() {
    this.emitterIn
      .on(BINANCE_BUY, (data: IOrderTrade) => this.handleBuy(data))
      .on(BINANCE_SELL, (data: IOrderTrade) => this.handleSell(data))
      .on(BINANCE_FUNDING_FEE, (data) => console.log(data))
  }
  
  run() {
    const overseasPrivateWebsocket = this.overseasPrivate.webSocket(true) // reconnect is true
    
    this.emitterIn
      .subscribe(overseasPrivateWebsocket)

    overseasPrivateWebsocket.run()
    
    this.onOverseasEmit()
  }
}

export { OrderClass as Order }