import dayjs from 'dayjs'

import { BinancePrivate } from '@modules/binance/private'
import { UpbitPrivate } from '@modules/upbit/private'
import { EventBroker } from '@modules/event-broker'
import { WalletController } from '@modules/wallet'
import { Automatic } from './automatic'

import { usdToKrw, round, getPremium, getPercent, calcPercentOf, round4, round8 } from '@utils'
import { USD_TO_KRW, BINANCE_FUNDING_FEE, BINANCE_SELL, BINANCE_BUY } from '@utils/constants'
import { BuyOrder, SellOrder } from '@models'

import type { WalletControllerType } from '@modules/wallet'
import type { IUserTradeWithEnv, IBuyOpenOrderResponse } from '@models/types'
import type { UpbitPrivateType } from '@modules/upbit/private/types'
import type { BinancePrivateType, IOrderTrade } from '@modules/binance/private/types'
import type { AutomaticType } from './automatic'


class OrderClass {
  private emitterOut!: EventBroker
  private emitterIn!: EventBroker

  private userInfo: IUserTradeWithEnv

  private wallet: WalletControllerType
  private overseasPrivate: BinancePrivateType
  private domesticPrivate: UpbitPrivateType
  private automatic: AutomaticType

  private openOrders: IBuyOpenOrderResponse[] = []

  private usdToKrw: number = 0

  constructor(
    emitter: EventBroker,
    userInfo: IUserTradeWithEnv
  ) {
    this.emitterOut = emitter
    this.emitterIn = new EventBroker()
    this.userInfo = userInfo
    const userEnv = userInfo.user_env

    this.domesticPrivate = new UpbitPrivate({ accessKey: userEnv.domestic_access_key, secretKey: userEnv.domestic_secret_key })
    this.overseasPrivate = new BinancePrivate({ accessKey: userEnv.overseas_access_key, secretKey: userEnv.overseas_secret_key })
    this.wallet = new WalletController(this.domesticPrivate, this.overseasPrivate)
    this.automatic = new Automatic(this.userInfo.symbol_id, this.openOrders, this.emitterOut, this.overseasPrivate)

    this.emitterOut.on(USD_TO_KRW, this.setUsdToKrw)
  }

  private setUsdToKrw = (response: number) => { this.usdToKrw = response }

  private async handleSell(data: IOrderTrade) { //구매
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
        price: domestic_executed_price, // <- 구매한 원화
        executed_volume: domestic_quantity,
        paid_fee: domestic_commission,
        created_at: domestic_trade_at,
      } = orderData

      const domestic_price = round(Number(domestic_executed_price) / Number(domestic_quantity))

      const premium = getPremium(domestic_price / fixedUsdToKrw, price)
      
      // PostgreSQL insert start
      const response = await BuyOrder.Exec.create({
        id: data.orderClientId, // uuid v7
        symbol_id: this.userInfo.symbol_id,
        user_id: this.userInfo.user_id,
        premium: premium,
        domestic_price: domestic_price,
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

      const log = [
        `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: [ Order Buy ]`,
        `user_id:\t${this.userInfo.user_id}`,
        `symbol_id:\t${this.userInfo.symbol_id}`,
        `premium:\t${premium}`,
        `domestic_quantity:\t${domestic_quantity}`,
        `overseas_quantity:\t${data.quantity}`,
        `usd_to_krw:\t${fixedUsdToKrw}`,
        `isMaker:\t${data.isMaker ? 'TRUE' : 'FALSE'}`,
      ].join('\n')

      console.log(log)


      this.openOrders.push({
        ...response,
        sold_domestic_quantity: 0,
        sold_overseas_quantity: 0
      })

      await this.wallet.updateWallets()

      this.automatic.setUnlock()

      // this.emitterOut.emit('alarmApp', response) // 추후 개발 예정 (거래 생성 알림 서비스)
    } catch (error) {
      throw error
    }
  }

  private async handleBuy(data: IOrderTrade) {
    try {
      // overseas에서 buy주문(long)이 발생하면 domestic에서는 sell주문(short)을 정해진 개수대로 하면 된다.
      // domestic(upbit)에서는 시장가 매도는 수량을 입력함.
      
      const openOrderIdx = this.openOrders.findIndex(openOrder => openOrder.id === data.orderClientId)
      const currentOrder = this.openOrders[openOrderIdx]

      const percent = getPercent(currentOrder.overseas_quantity, data.quantity)
      
      const currentDomesticVolume = calcPercentOf(currentOrder.domestic_quantity, percent, 8)

      const order = this.domesticPrivate.order() // upbit 주문 모듈
      
      // upbit 주문 시작
      const side = 'ask'
      const ord_type = 'market'
      const fixedUsdToKrw = this.usdToKrw
      const price = usdToKrw(data.price * data.quantity, fixedUsdToKrw)

      const uuid = await order.post({ symbol: data.symbol, side, ord_type, volume: currentDomesticVolume })
      const orderData = await order.get(uuid)

      const {
        executed_volume: domestic_quantity,
        paid_fee: domestic_commission,
        created_at: domestic_trade_at,
      } = orderData

      const domestic_executed_price = orderData.trades.reduce((acc, cur) => acc + Number(cur.funds), 0)
      
      // PostgreSQL insert start

      const domestic_price = round(domestic_executed_price / Number(domestic_quantity))

      const overseasInvestAmount = calcPercentOf(
        usdToKrw(currentOrder.overseas_price * currentOrder.overseas_quantity, currentOrder.usd_to_krw),
        percent
      )
      const domesticInvestAmount = calcPercentOf(
        currentOrder.domestic_price * currentOrder.domestic_quantity,
        percent
      )
      const investAmount = overseasInvestAmount + domesticInvestAmount // 총 투자금액(구매 할 당시, 개수 비례)

      const overseasFinalVal = usdToKrw(data.price * data.quantity, fixedUsdToKrw)
      const domesticFinalVal = domestic_price * Number(domestic_quantity)

      const finalVal = overseasFinalVal + domesticFinalVal // 최종 가치(현재 기준)

      const overseas_commission_when_buy = calcPercentOf(usdToKrw(currentOrder.overseas_commission, currentOrder.usd_to_krw), percent)
      const domestic_commission_when_buy = calcPercentOf(currentOrder.domestic_commission, percent)

      const commission_when_buy = overseas_commission_when_buy + domestic_commission_when_buy
      const commission_when_now = round(Number(domestic_commission) + usdToKrw(data.commission, fixedUsdToKrw))

      const profit_rate = round4(investAmount / (finalVal - investAmount) * 100)
      const net_profit_rate = round4((investAmount + commission_when_buy) / (finalVal - commission_when_now) - (investAmount + commission_when_buy) * 100)

      const sold_domestic_quantity = Number(domestic_quantity)
      const sold_overseas_quantity = data.quantity
      
      const payload = {
        buy_order_id: currentOrder.id,
        premium: getPremium(domestic_price / fixedUsdToKrw, price),
        domestic_price: domestic_price,
        domestic_quantity: sold_domestic_quantity,
        domestic_commission: Number(domestic_commission),
        overseas_price: data.price,
        overseas_quantity: sold_overseas_quantity,
        overseas_commission: data.commission,
        usd_to_krw: fixedUsdToKrw,
        is_maker: data.isMaker,
        domestic_trade_at: dayjs(domestic_trade_at).toDate(),
        overseas_trade_at: dayjs(data.eventTime).toDate(),
        profit_rate: profit_rate,
        net_profit_rate: net_profit_rate
      }
      
      await SellOrder.Exec.create(payload)
      // openOrderIdx
      // currentOrder

      const isClose = round8(currentOrder.sold_overseas_quantity + sold_overseas_quantity) === currentOrder.overseas_quantity

      const log = [
        `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: [ Order Buy ]`,
        `buy_order_id:\t${currentOrder.id}`,
        `user_id:\t${this.userInfo.user_id}`,
        `symbol_id:\t${this.userInfo.symbol_id}`,
        `premium:\t${payload.premium}`,
        `domestic_quantity:\t${domestic_quantity}`,
        `overseas_quantity:\t${data.quantity}`,
        `usd_to_krw:\t${fixedUsdToKrw}`,
        `profit_rate:t${profit_rate}`,
        `net_profit_rate:t${net_profit_rate}`,
        `isMaker:\t${data.isMaker ? 'TRUE' : 'FALSE'}`,
        `isClose:\t${isClose ? 'TRUE' : 'FALSE'}`
      ].join('\n')

      console.log(log)
      
      if(!isClose) { // 아직 한발 남았다.
        this.openOrders.splice(
          openOrderIdx,
          1,
          {
            ...currentOrder,
            sold_domestic_quantity: round8(currentOrder.sold_domestic_quantity + sold_domestic_quantity),
            sold_overseas_quantity: round8(currentOrder.sold_overseas_quantity + sold_overseas_quantity),
          }
        )
      }else {
        await BuyOrder.Exec.updateToClose(currentOrder.id)
        this.openOrders.splice(openOrderIdx, 1)
      }

      await this.wallet.updateWallets()
      this.automatic.setUnlock()
      // this.emitterOut.emit('alarmApp', response) // 미완성
    } catch (error) {
      throw error
    }
  }
  
  private onOverseasStream() {
    this.emitterIn
      .on(BINANCE_BUY, (data: IOrderTrade) => this.handleBuy(data))
      .on(BINANCE_SELL, (data: IOrderTrade) => this.handleSell(data))
      .on(BINANCE_FUNDING_FEE, (data) => console.log(data))
  }

  private async initOpenOrders() {
    try {
      const openOrders = await BuyOrder.Exec.findOpenOrders({ symbol_id: this.userInfo.symbol_id, user_id: this.userInfo.user_id })
      const log = [
        `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: [ Initialized Open Order ]`,
        `user_id:\t${this.userInfo.user_id}`,
        `symbol_id:\t${this.userInfo.symbol_id}`,
        `open_orders_length:\t${openOrders.length}`
      ].join('\n')

      console.log(log)
      
      this.openOrders.push(...openOrders)
    } catch (error) {
      throw error
    }
  }
  
  async run() {
    try {
      await this.initOpenOrders()
      const overseasPrivateWebsocket = this.overseasPrivate.webSocket(true) // reconnect is true
      
      this.emitterIn.subscribe(overseasPrivateWebsocket) // binance user stream구독
      this.emitterOut.subscribe(this.wallet) // wallet정보를 구독 wallet은 사용가능한 USDT, KRW가 들어있음.
  
      overseasPrivateWebsocket.run() // user stream 시작
      this.onOverseasStream() // user stream event 받기
  
      await this.automatic.run(240)
  
      this.wallet.updateWallets()
    } catch (error) {
      throw error
    }
  }
}

export { OrderClass as Order }