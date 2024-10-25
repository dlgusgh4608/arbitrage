import dayjs from 'dayjs'
import { Premium } from '@apps/collector/types';
import { Abstract } from './abstract'

import { krwToUsd, getPremium, getShoulderValue, getKneeValue, floor2, round2 } from '@utils'

import type { EventBrokerType } from '@modules/event-broker'
import type { BinancePrivateType } from '@modules/binance/private/types'
import type { IBuyOpenOrderResponse } from '@models/types'

const MINIMUM_MOVE_VALUE = 0.2
const MINIMUM_PROFIT_RATE = 0.35
const STOP_LOSS = -0.5
const AVG_DOWN = -0.5
const ORDER_STAIRS = 2
const SAFETY_WALLET_PERCENT = 0.98
const LEVERAGE = 5 // 추후에 Event받아와 업데이트 해줘야함.
const LOGGER_INTERVAL = 1000 * 60 * 3

export class Automatic extends Abstract {
  private mvPriceStack: number[] = []
  private prevOverseasPrice: number = 0
  private overseasPrice: number = 0


  private premiumOfStandardUsdToKrw = 0
  private knee = 0
  private shoulder = 0
  private avg_usd_to_krw = 0
  
  constructor(
    symbolId: number,
    userId: number,
    openOrders: IBuyOpenOrderResponse[],
    emitter: EventBrokerType,
    overseasPrivate: BinancePrivateType
  ) {
    super(symbolId, userId, openOrders, emitter, overseasPrivate)

    setInterval(() => this.logger(), LOGGER_INTERVAL)
  }

  private clearVariables = (): void => {
    this.mvPriceStack = []
    this.prevOverseasPrice = 0
    this.overseasPrice = 0
  }

  private logger = () => {
    const log = [
      `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: [ Automatic Information ]`,
      `premiumOfStandard:\t${this.premiumOfStandardUsdToKrw}`,
      `knee:\t${this.knee}`,
      `shoulder:\t${this.shoulder}`,
      `avg_usd_to_krw:\t${this.avg_usd_to_krw}`,
      `user_id:\t${this.userId}`,
      `trading_position_length:\t${this.openOrders.length}`,
    ]

    this.openOrders.forEach((openOrder, index) => {
      const premiumByOrder = getPremium(krwToUsd(openOrder.domestic_price, this.avg_usd_to_krw), openOrder.overseas_price)
      const profit_rate = this.premiumOfStandardUsdToKrw - premiumByOrder

      log.push(`[open_order_profit_rate:${index}]:\t${profit_rate}`)
    })
    
    console.log(log.join(`\n`))
  }
  
  protected trade = async (response: Premium): Promise<void> => {
    try {
      if(this.lock) return // lock시 return
      const { avg_usd_to_krw, max_premium, min_premium } = this.standardPremium

      if(!max_premium || !min_premium) return //database의 데이터가 충분치 않을경우 return

      const { overseas, symbol, domestic, usdToKrw, premium } = response

      this.prevOverseasPrice = this.overseasPrice
      this.overseasPrice = overseas
      
      if(this.prevOverseasPrice < 1) return // 움직임을 구하기위해 prev가 필요함

      const mvPrice = Math.abs(this.overseasPrice - this.prevOverseasPrice)
      this.mvPriceStack.push(mvPrice)

      if(this.mvPriceStack.length < 6) return //최근 5번의 움직임 평균을 구하여 Target함.
      this.mvPriceStack.shift()
      
      const premiumOfStandardUsdToKrw = getPremium(krwToUsd(domestic, avg_usd_to_krw), overseas)
      const knee = getKneeValue(max_premium, min_premium)
      const shoulder = getShoulderValue(max_premium, min_premium)
      this.avg_usd_to_krw = avg_usd_to_krw
      this.knee = knee
      this.shoulder = shoulder
      this.premiumOfStandardUsdToKrw = premiumOfStandardUsdToKrw
      const profitRate = shoulder - knee < MINIMUM_PROFIT_RATE ? MINIMUM_PROFIT_RATE : shoulder - knee
      
      const average = this.mvPriceStack.reduce((a, c) => a + c, 0) / this.mvPriceStack.length
      const moveValue = average < MINIMUM_MOVE_VALUE ? MINIMUM_MOVE_VALUE : average
      
      // 매도 시작
      if(this.openOrders.length > 0) {        
        const targetOrder = this.openOrders.find(order => {
          const domestic_price = order.domestic_price
          const overseas_price = order.overseas_price
          const premiumByOrder = getPremium(krwToUsd(domestic_price, avg_usd_to_krw), overseas_price)
          if(profitRate < premiumOfStandardUsdToKrw - premiumByOrder) return true // 가변 target수익률을 최근 평균 usd to krw 기준으로 김프 2개를 가지고 계산
          if(STOP_LOSS > premiumOfStandardUsdToKrw - premiumByOrder) return true // 스탑로스 (손절) 라인을 지나치면 target order로 return
        })

        if(targetOrder) { // 수익률 조건이 채워짐 --- 매도 거래 진행
          this.setLock()

          const soldOverseasQuantity = targetOrder.sold_overseas_quantity || 0
          const targetPrice = floor2(overseas - moveValue)
          
          const quantity = round2(targetOrder.overseas_quantity - soldOverseasQuantity)

          const premiumByOrder = getPremium(krwToUsd(targetOrder.domestic_price, avg_usd_to_krw), targetOrder.overseas_price)
          const profit = premiumOfStandardUsdToKrw - premiumByOrder
          
          const log = [
            `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: [ Try Sell ]`,
            `order_id:\t${targetOrder.id}`,
            `symbol_name:\t${symbol}`,
            `target_price:\t${targetPrice}`,
            `target_quantity:\t${quantity}`,
            `target_profit:\t${profitRate}`,
            `current_profit:\t${profit}`,
            `stop_loss:\t${STOP_LOSS}`,
          ].join(`\n`)

          console.log(log)

          await this.createOrder(symbol, 'BUY', quantity, targetPrice, targetOrder.id)

          return this.clearVariables()
        }
      }
      // 매도 종료

      if(this.walletLock) return console.log('wallet lock!') // 매수 진행시 지갑의 잔액이 부족할 때 lock을 걸어둠
      
      // 매수 시작
      if(knee > premiumOfStandardUsdToKrw) {
        const {
          domestic: cleanKrw,
          overseas: cleanUsdt
        } = this.cleanPositionWallet

        const safeWalletPercent = SAFETY_WALLET_PERCENT - Math.abs(premium / 100)
        const miniumCleanWalletValueToUSDT = (Math.min(krwToUsd(cleanKrw, usdToKrw), cleanUsdt * LEVERAGE) * safeWalletPercent) / ORDER_STAIRS

        const {
          domestic: krw,
          overseas: usdt
        } = this.wallets
        
        const miniumWalletValueToUSDT = Math.min(krwToUsd(krw, usdToKrw), usdt * LEVERAGE) * safeWalletPercent

        const targetTotalPriceUSDT = miniumCleanWalletValueToUSDT < miniumWalletValueToUSDT
          ? miniumCleanWalletValueToUSDT
          : miniumWalletValueToUSDT

        const targetPrice = floor2(overseas + moveValue)
        
        const targetQuantity = floor2(targetTotalPriceUSDT / targetPrice)
        
        
        if(this.openOrders.length > 0) { // 이미 이와 비슷한 자리에서 구매를 함.
          const ifTargetOrders = this.openOrders.map(order => {
            const domestic_price = order.domestic_price
            const overseas_price = order.overseas_price
            const premiumByOrder = getPremium(krwToUsd(domestic_price, Number(avg_usd_to_krw)), overseas_price)
            return premiumByOrder
          })

          if(AVG_DOWN > premiumOfStandardUsdToKrw - Math.max(...ifTargetOrders)) { // 내가 가지고 있는 모든 order가 -0.5%보다 작음
            this.setLock()
            
            const log = [
              `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: [ Try Buy ]`,
              `symbol_name:\t${symbol}`,
              `knee_price:\t${knee}`,
              `premium_of_standard:\t${premiumOfStandardUsdToKrw}`,
              `target_price:\t${targetPrice}`,
              `target_quantity:\t${targetQuantity}`,
            ].join(`\n`)

            console.log(log)
            await this.createOrder(symbol, 'SELL', targetQuantity, targetPrice)

            return this.clearVariables()
          }
        } else { // 비슷한 자리가 없음
          this.setLock()

          const log = [
            `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: [ Try Buy ]`,
            `symbol_name:\t${symbol}`,
            `knee_price:\t${knee}`,
            `premium_of_standard:\t${premiumOfStandardUsdToKrw}`,
            `target_price:\t${targetPrice}`,
            `target_quantity:\t${targetQuantity}`,
          ].join(`\n`)

          console.log(log)

          await this.createOrder(symbol, 'SELL', targetQuantity, targetPrice)

          return this.clearVariables()
        }
        // 매수 종료
      }
    } catch (error) {
      throw error
    }
  }

}

export type AutomaticType = InstanceType<typeof Automatic>