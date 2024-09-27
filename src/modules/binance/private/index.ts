import { createHmac } from 'crypto'
import { stringify } from 'querystring'

import { Account } from './rest/account'

import type { ITokens, IAuth } from './types'

const TOKEN_HASH_TYPE = 'SHA256'

export class BinancePrivate {
  #accessKey: string
  #secretKey: string

  constructor({ accessKey, secretKey }: ITokens) {
    this.#accessKey = accessKey
    this.#secretKey = secretKey
  }

  #generateTokenOfCurry = ({ accessKey, secretKey }: ITokens) => (body: { [key: string]: any } = {}): IAuth => {
    const qs = Object.keys(body).length > 0 ? stringify(body) : ''

    const signature = createHmac(TOKEN_HASH_TYPE, secretKey).update(qs).digest('hex')
    
    const payload = {
      ...body,
      signature
    }
    
    return { apiKey: accessKey, signature: payload }
  }

  account() {
    return new Account(this.#generateTokenOfCurry({ accessKey: this.#accessKey, secretKey: this.#secretKey }))
  }
}

export type BinancePrivateType = InstanceType<typeof BinancePrivate>
