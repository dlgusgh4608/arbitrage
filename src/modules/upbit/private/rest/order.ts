import axios, { AxiosError } from 'axios'
import { isUpbitSymbol } from '@utils/regex'
import { removeUndefinedInObject, wait } from '@utils'

import type { IAuth, IOrderPost, IOrder } from '../types'

export class Order {
  private generateToken: (body: any) => IAuth
  
  constructor(generateToken: (body: any) => IAuth) {
    this.generateToken = generateToken
  }

  private postValidation({ symbol, side, volume, price, ord_type }: IOrderPost): void {
    try {
      if(!symbol) throw new Error('symbol is required')
      if(side !== 'bid' && side !== 'ask') throw new Error('side must be bid or ask')
      
      switch(ord_type) {
        case 'limit':
          if(!volume) throw new Error('if ord_type is limit, volume is required')
          if(!price) throw new Error('if ord_type is limit, price is required')
          break
        case 'price':
          if(!price) throw new Error('if ord_type is price, price is required')
          break
        case 'market':
          if(!volume) throw new Error('if ord_type is market, volume is required')
          break
        default:
          throw new Error('ord_type must be limit, price, or market')
      }
    } catch (error) {
      throw error
    }
  }

  async post({ symbol, side, volume, price, ord_type }: IOrderPost): Promise<string> {
    try {
      this.postValidation({ symbol, side, volume, price, ord_type })
      
      const market = symbol.match(isUpbitSymbol) ? symbol : `KRW-${symbol.toUpperCase()}`
      
      const body = removeUndefinedInObject({
        market,
        side,
        volume,
        price,
        ord_type,
      })

      const { Authorization } = this.generateToken(body)

      const payload = {
        method: 'POST',
        url: 'https://api.upbit.com/v1/orders',
        headers: {
          Authorization,
        },
        data: body,
      }

      const { data }: { data: { uuid: string } } = await axios(payload)
      
      return data.uuid // 나중에 조회 할 때 필요
    } catch (error) {
      if(error instanceof AxiosError) {
        const e = error.response?.data ? error.response?.data : error.response
        console.log(e)
        throw error
      }else {
        console.log(error)
        throw error
      }
    }
  }

  async get(uuid: string): Promise<IOrder> {
    try {
      if(!uuid) throw new Error('uuid is required')
      
      const body = { uuid }
      
      const { Authorization, qs } = this.generateToken(body)
      
      const payload = {
        method: 'GET',
        url: `https://api.upbit.com/v1/order?${qs}`,
        headers: {
          Authorization,
        },
        data: body,
      }

      await wait(1000) // 재귀함수의 딜레이를 위한 1초

      const { data }: { data: IOrder } = await axios(payload)

      if(data.state !== 'done' && data.state !== 'cancel') { // 전체 완료 혹은 취소 아님 재귀
        return await this.get(uuid)
      }

      return data
    } catch (error) {
      if(error instanceof AxiosError) {
        throw error.response?.data ? error.response?.data : error.response
      }
      throw error
    }
  }
}

export type OrderType = InstanceType<typeof Order>