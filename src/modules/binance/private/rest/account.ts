import axios from 'axios'

import type { IAuth } from '../types'

import { Auth } from './auth'

const ACCOUNT_INFO_URL = 'https://fapi.binance.com/fapi/v3/balance'

export interface AccountBalance {
  accountAlias: string;              // unique account code
  asset: string;                      // asset name
  balance: string;                    // wallet balance
  crossWalletBalance: string;         // crossed wallet balance
  crossUnPnl: string;                 // unrealized profit of crossed positions
  availableBalance: string;           // available balance
  maxWithdrawAmount: string;          // maximum amount for transfer out
  marginAvailable: boolean;           // whether the asset can be used as margin in Multi-Assets mode
  updateTime: number;                 // timestamp of the last update
}


export class Account extends Auth {
  constructor(genTokenFunc: (body: { [key: string]: any }) => IAuth) {
    super(genTokenFunc)
  }

  async getWallet(): Promise<AccountBalance[]> {
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

      const { data } = await axios<AccountBalance[]>(payload)

      return data
    } catch (error) {
      throw error
    }
  }
}