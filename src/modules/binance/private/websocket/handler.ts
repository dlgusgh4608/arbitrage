import EventEmitter from 'events'
import dayjs from 'dayjs'

import { round8 } from '@utils'

import { BINANCE_BUY, BINANCE_FUNDING_FEE, BINANCE_LISTEN_KEY_EXPIRED, BINANCE_SELL } from '@utils/constants'

import type {
  IOriginOrderTradeUpdate,
  IOriginAccountUpdate,
  IFundingFees,
  IOrderTrade
} from '../types'

const ORDER_TICKER_TIMEOUT = 1000 * 3

export class BinancePrivateWebsocketHandler extends EventEmitter {
  private orderMap: Map<string, IOrderTrade[]> = new Map()
  private orderTickerMap: Map<string, ReturnType<typeof setTimeout>> = new Map()
  
  constructor() { super() }

  private emitKeyForSide(orderTrade: IOrderTrade) {
    return orderTrade.side === 'BUY' ? BINANCE_BUY : BINANCE_SELL
  }
  
  private filledOrderTrade(orderId: string, payload: IOrderTrade) {
    const oldOrder = this.orderMap.get(orderId)

    if(oldOrder) { // 부분 체결 후 전부 체결
      const orderPayload = this.calculateOrders([...oldOrder, payload])
      this.emit(this.emitKeyForSide(orderPayload), orderPayload)
      const currentOrderTicker = this.orderTickerMap.get(orderId)
      
      clearTimeout(currentOrderTicker) // 타이머 종료
      this.orderMap.delete(orderId) // orderMap 제거
      this.orderTickerMap.delete(orderId) // orderTicker 제거
    }else { // 한번에 전부 체결
      this.emit(this.emitKeyForSide(payload), payload)
    }
  }

  private partiallyFilledOrderTrade(orderId: string, payload: IOrderTrade) {
    const oldOrder = this.orderMap.get(orderId)

    /**
     * 이 파트에 들어오면 이미 생성된 order에 체결이 1회 이상 일어난 상황
     * 이전 order가 있으면 배열에 push 아님 새로 생성
     * 만약 새로 생성 시 전부 체결이 되기 전 3초의 대기시간
     * 대기시간 3초가 지나면 전부 체결로 간주
     */
    if(oldOrder) {
      oldOrder.push(payload)
    }else {
      this.orderMap.set(orderId, [payload])
      this.setTicker(orderId)
    }
  }

  protected switchOrderTrade(data: IOriginOrderTradeUpdate) {
    const order = data.o
    const eventTime = data.E
    const orderId = order.c
    const orderStatus = order.X
    const side = order.S
    const symbol = order.s
    const price = order.L
    const quantity = order.l
    const isMaker = order.m
    const commission = order.n

    const orderTradePayload: IOrderTrade = {
      symbol: symbol.replace('USDT', '').toLowerCase(),
      side,
      price: Number(price),
      quantity: Number(quantity),
      commission: Number(commission),
      isMaker,
      eventTime
    }


    switch(orderStatus) {
      // case 'NEW': { // 새로운 주문.
      //   this.newOrderTrade(data)
      //   break
      // }
      case 'PARTIALLY_FILLED': { // 부분 체결.
        this.partiallyFilledOrderTrade(orderId, orderTradePayload)
        break
      } 
      case 'FILLED': { // 체결 완료.
        this.filledOrderTrade(orderId, orderTradePayload)
        break
      }
    }
  }
  
  protected handleAccountUpdate(data: IOriginAccountUpdate) {
    const eventReasonType = data.a.m

    switch(eventReasonType) {
      case 'FUNDING_FEE': {
        const eventTime = data.E
        const balances = data.a.B

        const fundingFees = balances.map(balance => ({ asset: balance.a, fee: Number(balance.bc) }))

        const payload: IFundingFees = {
          eventTime: dayjs(eventTime).toDate(),
          fees: fundingFees
        }

        this.emit(BINANCE_FUNDING_FEE, payload)
        break
      } // 추후에 다른 타입 추가
    }

  }
  
  protected handleListenKeyExpired() {
    console.log(`listenKey expired!`)
    this.emit(BINANCE_LISTEN_KEY_EXPIRED, null)
  }

  private calculateOrders(orders: IOrderTrade[]): IOrderTrade {
    const firstOrder = orders[0]
    const orderLength = orders.length
    
    const sumOrder = orders.reduce((acc, cur) => ({
      quantity: acc.quantity + cur.quantity,
      price: acc.price + cur.price,
      commission: acc.commission + cur.commission,
    }), { quantity: 0, price: 0, commission: 0 })

    const payload: IOrderTrade = {
      symbol: firstOrder.symbol,
      side: firstOrder.side,
      price: round8(sumOrder.price / orderLength), // 평균
      quantity: round8(sumOrder.quantity), // 합계
      commission: round8(sumOrder.commission), // 합계
      isMaker: firstOrder.isMaker,
      eventTime: firstOrder.eventTime
    }

    return payload
  }

  private setTicker(orderId: string) {
    const ticker = setTimeout(() => {
      const orders = this.orderMap.get(orderId)
      const payload = this.calculateOrders(orders!)

      this.orderMap.delete(orderId)
      this.orderTickerMap.delete(orderId)
      this.emit(this.emitKeyForSide(payload), payload)
    }, ORDER_TICKER_TIMEOUT)

    this.orderTickerMap.set(orderId, ticker)
  }
}