import dayjs from 'dayjs'
import { SymbolPrice } from '@models'
import { v7 } from 'uuid'

import type { Premium } from '@apps/collector/types'

import type { EventBrokerType } from '@modules/event-broker'
import type { BinancePrivateType, BinanceOrderType } from '@modules/binance/private/types'
import type { IBuyOpenOrderResponse, IPremiumBySymbolIdInMinuteResponse } from '@models/types'
import type { IWallets } from '@modules/wallet'
import { isAxiosError } from 'axios'


const UNLOCK_TIME_OUT = 5000
const CHECK_STATUS_TIME_OUT = 3000

export abstract class Abstract {
  private readonly emitter: EventBrokerType
  private readonly overseasOrder: BinanceOrderType
  private readonly key: string
  private readonly symbolId: number
  
  protected walletLock: boolean = false
  protected lock: boolean = false
  protected cleanPositionWallet: IWallets = { domestic: 0, overseas: 0 }
  protected wallets: IWallets = { domestic: 0, overseas: 0 } // 주문을 할시 지갑 사정에 따라 달라지기 때문에 필요
  protected openOrders: IBuyOpenOrderResponse[] = [] // 매도를 하기 위해서는 기존의 order가 필요
  protected standardPremium: IPremiumBySymbolIdInMinuteResponse = { // 매매를 위한 기준점. (추후에 수정 될 수 있음)
    avg_usd_to_krw: 0,
    max_premium: 0,
    min_premium: 0
  }
  
  constructor(
    symbolId: number,
    openOrders: IBuyOpenOrderResponse[],
    emitter: EventBrokerType,
    overseasPrivate: BinancePrivateType
  ) {
    this.symbolId = symbolId
    this.key = [String(symbolId), 'trade'].join('-')
    this.openOrders = openOrders
    this.emitter = emitter
    this.overseasOrder = overseasPrivate.order()

    this.emitter.on('wallets', (wallets: IWallets) => {
      this.walletLock = false
      this.wallets = wallets
      if(this.cleanPositionWallet.domestic === 0) this.cleanPositionWallet = wallets
      if(this.openOrders.length < 1) this.cleanPositionWallet = wallets
    })
  }

  protected abstract trade(response: Premium): Promise<void> //lock이 true일시 return

  public async setPremiumBySymbolPriceInMinute(minute: number = 360) {
    try {
      const response = await SymbolPrice.Exec.findPremiumBySymbolIdInMinute(this.symbolId, minute)
      
      const log = [
        `${dayjs().format('YYYY-MM-DD HH:mm:ss')}: [ Set Standard Premium ]`,
        `symbol_id:\t${this.symbolId}`,
        `data_of_minute:\t${minute}minute`,
        `maximum:\t${response.max_premium}`,
        `minimum:\t${response.min_premium}`,
        `standard_usd_to_krw:\t${response.avg_usd_to_krw}`,
      ].join(`\n`)

      console.log(log)
      
      this.standardPremium = response
    } catch (error) {
      throw error
    }
  }

  private runStandardPremiumInterval(intervalInMinute: number) {
    const interval = intervalInMinute * 60 * 1000
    setInterval(() => this.setPremiumBySymbolPriceInMinute(), interval)
  }
  
  private handleOrder(usdtSymbol: string, origClientOrderId: string) {
    try {
      // FILLED(완전 체결), REJECTED(반려), CANCELED(취소)를 제외한 다른 Status시 거래소 Server와 동시성 문제로 인해 5초이후 lock을 해제 user stream 파일의 order_ticker_timeout이 3초
      const unlockAfter5Sec = () => setTimeout(() => this.setUnlock(), UNLOCK_TIME_OUT)
      
      const routine = async (usdtSymbol: string, origClientOrderId: string, tryCount: number = 0) => {
        try {
          const { status } = await this.overseasOrder.get(usdtSymbol, origClientOrderId)
          const nowDateFormat = dayjs().format('YYYY-MM-DD HH:mm:ss')
          
          const log = [
            `${nowDateFormat}: [ CHECK_ORDER ]`,
            `status:\t${status}`,
            `usdt_symbol:\t${usdtSymbol}`,
            `retry_count:\t${tryCount}`,
          ].join(`\n`)

          console.log(log)

          if(status === 'FILLED' || status === 'REJECTED' || status === 'CANCELED') return //외부에서 unlock

          if(status === 'NEW') {
            console.log(`${nowDateFormat}: [ CANCEL_ORDER (${usdtSymbol}) ]`)
            
            await this.overseasOrder.cancel(usdtSymbol, origClientOrderId)
            unlockAfter5Sec()
          }else if(tryCount < 3) { // PARTIALLY_FILLED(부분체결) 누가 내 매물대 긁고 간거임. 3번까지 반복
            console.log(`${nowDateFormat}: [ TRY AGAIN (${usdtSymbol}) ]`)
            setTimeout(() => routine(usdtSymbol, origClientOrderId, tryCount + 1), CHECK_STATUS_TIME_OUT)
          }else { // 3회 반복 종료.
            console.log(`${nowDateFormat}: [ CANCEL_ORDER (${usdtSymbol}) ]`)
            await this.overseasOrder.cancel(usdtSymbol, origClientOrderId)
            unlockAfter5Sec()
          }
        } catch (error) {
          throw error
        }
      }

      setTimeout(() => routine(usdtSymbol, origClientOrderId), CHECK_STATUS_TIME_OUT)
    } catch (error) {
      throw error
    }
  }
  protected setLock = (): void => { this.lock = true }
  public setUnlock = (): void => { this.lock = false }

  protected async createOrder(symbol: string, type: 'BUY' | 'SELL', quantity: number, price: number, key?: string) {
    this.setLock()
    
    const usdtSymbol = symbol.toUpperCase().concat('USDT')
    const uuid = key || v7()
    
    try {
      // v4대신 v7사용 이유는 시간순으로 값을 생성해서 btree인덱스에 유리함.
      const { clientOrderId } = await this.overseasOrder.create(uuid, 'LIMIT', usdtSymbol, type, quantity, price)
      this.handleOrder(usdtSymbol, clientOrderId)
    } catch (error) {
      if(isAxiosError(error)) {
        const { code } = error.response?.data
        /**
         * -2019 Margin is insufficient. ( 주문 만들고싶은데 돈이 없어서 못만듬. 슬픈 상황 )
         */
        if(code === -2019) {
          this.walletLock = true
          this.setUnlock()
        }
      }else {
        console.log(error)
        throw error
      }
    }
  }
  
  public async run(standardPremiumIntervalInMinute: number = 180) {
    try {
      await this.setPremiumBySymbolPriceInMinute(360)
      this.runStandardPremiumInterval(standardPremiumIntervalInMinute)

      this.emitter.on(this.key, this.trade)
    } catch (error) {
      throw error
    }
  }
}