import axios from 'axios'
import { Auth } from './auth'
import type { IAuth } from '../types'

const LISTEN_KEY_URL = 'https://fapi.binance.com/fapi/v1/listenKey'

interface IListenKeyResponse {
  listenKey: string
}

export class BinanceListenKey extends Auth {
  constructor(genTokenFunc: (body: { [key: string]: any }) => IAuth) {
    super(genTokenFunc)
  }

  async get(): Promise<string> {
    try {
      const { apiKey, signature } = this.generateToken({})

      const payload = {
        method: 'POST',
        url: LISTEN_KEY_URL,
        headers: {
          'X-MBX-APIKEY': apiKey
        },
        params: signature
      }

      const { data } = await axios<IListenKeyResponse>(payload)

      return data.listenKey
    } catch (error) {
      throw error
    }
  }

  async update(listenKey: string): Promise<string> {
    try {
      const { apiKey, signature } = this.generateToken({ listenKey })

      const payload = {
        method: 'PUT',
        url: LISTEN_KEY_URL,
        headers: {
          'X-MBX-APIKEY': apiKey
        },
        params: signature
      }

      const { data } = await axios<IListenKeyResponse>(payload)

      return data.listenKey
    } catch (error) {
      throw error
    }
  }
}

export type BinanceListenKeyType = InstanceType<typeof BinanceListenKey>