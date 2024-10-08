import axios from 'axios'

import type { IAuth } from '../types'

import { Auth } from './auth'

const ACCOUNT_INFO_URL = 'https://fapi.binance.com/fapi/v2/account'

export class Account extends Auth {
  constructor(genTokenFunc: (body: { [key: string]: any }) => IAuth) {
    super(genTokenFunc)
  }

  async getInfo() {
    try {
      const { apiKey, signature } = this.generateToken({ timestamp: Date.now() })

      const payload = {
        method: 'GET',
        url: ACCOUNT_INFO_URL,
        headers: {
          'X-MBX-APIKEY': apiKey
        },
        params: signature
      }

      const { data } = await axios(payload)

      return data
    } catch (error) {
      throw error
    }
  }
}