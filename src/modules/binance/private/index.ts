import { createHmac } from 'crypto'
import { stringify } from 'querystring'

import { BinanceAccount } from './rest/account'
import { BinanceListenKey } from './rest/listenKey'
import { BinanceOrder } from './rest/order'
import { BinancePrivateWebsocket } from './websocket'
import type { ITokens, IAuth } from './types'

const TOKEN_HASH_TYPE = 'SHA256'

export class BinancePrivate {
  private accessKey: string
  private secretKey: string

  constructor({ accessKey, secretKey }: ITokens) {
    this.accessKey = accessKey
    this.secretKey = secretKey
  }

  private generateTokenOfCurry = (accessKey: string, secretKey: string) => (body: { [key: string]: any } = {}): IAuth => {
    const qs = Object.keys(body).length > 0 ? stringify(body) : ''

    const signature = createHmac(TOKEN_HASH_TYPE, secretKey).update(qs).digest('hex')
    
    const payload = {
      ...body,
      signature
    }
    
    return { apiKey: accessKey, signature: payload }
  }

  account() {
    return new BinanceAccount(this.generateTokenOfCurry(this.accessKey, this.secretKey))
  }

  listenKey() {
    return new BinanceListenKey(this.generateTokenOfCurry(this.accessKey, this.secretKey))
  }

  order() {
    return new BinanceOrder(this.generateTokenOfCurry(this.accessKey, this.secretKey))
  }

  webSocket(reconnect: boolean = true) {
    return new BinancePrivateWebsocket(this, reconnect)
  }
}

export type BinancePrivateType = InstanceType<typeof BinancePrivate>
