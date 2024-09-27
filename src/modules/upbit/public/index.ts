import { UpbitPublicWebsocket } from './websocket'

export class UpbitPublic {
  constructor() {}

  websocket(symbols: string[], uniqueTicket: string): UpbitPublicWebsocket {
    return new UpbitPublicWebsocket(symbols, uniqueTicket)
  }
}

export type UpbitPublicType = InstanceType<typeof UpbitPublic>