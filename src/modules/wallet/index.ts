import EventEmitter from 'events'
import type { UpbitPrivateType, IWallet } from '@modules/upbit/private/types'
import type { BinancePrivateType, AccountBalance } from '@modules/binance/private/types'

export interface IWallets {
  domestic?: IWallet,
  overseas?: AccountBalance
}

export class WalletController {
  private emitterOut?: EventEmitter
  
  private binancePrivate: BinancePrivateType
  private upbitPrivate: UpbitPrivateType

  private wallets: IWallets = { domestic: undefined, overseas: undefined }
  
  constructor(upbitPrivate: UpbitPrivateType, binancePrivate: BinancePrivateType) {
    this.upbitPrivate = upbitPrivate
    this.binancePrivate = binancePrivate
  }

  private async updateBinanceWallet(): Promise<void> {
    try {
      const wallet = await this.binancePrivate.account().getWallet()
      const usdt = wallet.find(resource => resource.asset === 'USDT')
      this.wallets.overseas = usdt
    } catch (error) {
      throw error
    }
  }

  private async updateUpbitWallet(): Promise<void> {
    try {
      const wallet = await this.upbitPrivate.wallet().get()
      const krw = wallet.find(resource => resource.currency === 'KRW')
      this.wallets.domestic = krw
    } catch (error) {
      throw error
    }
  }

  public async updateWallets(): Promise<void> {
    try {
      if(!this.emitterOut) throw new Error('bind first!')
      
      await Promise.all([this.updateBinanceWallet(), this.updateUpbitWallet()])

      this.emitterOut.emit('wallets', this.wallets)
    } catch (error) {
      throw error
    }
  }

  bind(emitter: EventEmitter = new EventEmitter()) { this.emitterOut = emitter }
}

export type WalletControllerType = InstanceType<typeof WalletController>