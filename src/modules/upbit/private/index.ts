import { v4 as uuidv4 } from 'uuid'
import { sign } from 'jsonwebtoken'
import { createHash } from 'crypto'
import { stringify } from 'querystring'

import { Order } from './rest/order'

import type { ITokens, IAuth } from './types'

const TOKEN_HASH_TYPE = 'SHA512'

export class UpbitPrivate {
  #accessKey: string
  #secretKey: string

  constructor({ accessKey, secretKey }: ITokens) {
    this.#accessKey = accessKey
    this.#secretKey = secretKey
  }

  #generateTokenOfCurry = ({ accessKey, secretKey }: ITokens) => (body: { [key: string]: any }): IAuth => {
    const qs = stringify(body)

    const hash = createHash(TOKEN_HASH_TYPE)
    const queryHash = hash.update(qs).digest('hex')

    const payload = {
      access_key: accessKey,
      nonce: uuidv4(),
      query_hash: queryHash,
      query_hash_alg: TOKEN_HASH_TYPE
    }

    const token = sign(payload, secretKey)

    const Authorization = `Bearer ${token}`

    return {
      Authorization,
      qs
    }
  }

  order() {
    return new Order(this.#generateTokenOfCurry({ accessKey: this.#accessKey, secretKey: this.#secretKey }))
  }
}

export type UpbitPrivateType = InstanceType<typeof UpbitPrivate>