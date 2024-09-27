import { BinancePublicWebsocket } from './websocket'

export class BinancePublic {
  constructor() {}

  websocket(symbols: string[]): BinancePublicWebsocket {
    return new BinancePublicWebsocket(symbols)
  }
}

  export type BinancePublicType = InstanceType<typeof BinancePublic>