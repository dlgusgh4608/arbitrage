import axios from 'axios'


import type { IAuth, IWallet } from '../types'

const WALLET_URL = 'https://api.upbit.com/v1/accounts'

export class Wallet {
  private generateToken: (body: any) => IAuth
  
  constructor(generateToken: (body: any) => IAuth) {
    this.generateToken = generateToken
  }

  async get(): Promise<IWallet[]> {
    try {
      const { Authorization, qs } = this.generateToken({})
      
      const payload = {
        method: 'GET',
        url: WALLET_URL,
        headers: {
          Authorization,
        },
      }

      const { data } = await axios<IWallet[]>(payload)
      
      return data
    } catch (error) {
      throw error
    }
  }
  

}

export type AccountType = InstanceType<typeof Wallet>