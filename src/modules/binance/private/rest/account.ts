import axios from 'axios'

import type { IAuth } from '../types'

const ACCOUNT_INFO_URL = 'https://fapi.binance.com/fapi/v2/account'

export class Account {
  #generateToken: (body: any) => IAuth
  
  constructor(generateToken: (body: any) => IAuth) {
    this.#generateToken = generateToken
  }

  async getInfo() {
    try {
      const { apiKey, signature } = this.#generateToken({ timestamp: Date.now() })

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