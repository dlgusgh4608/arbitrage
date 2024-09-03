import UpbitEmitter, { SubscribeMessage } from './modules/upbit'

const upbitSubscribeMessage: SubscribeMessage[] = [
  { ticket: 'upbitArbitrageTicket' },
  {
    type: 'trade',
    codes: ['KRW-BTC']
  },
  {
    type: 'orderbook',
    codes: ['KRW-BTC']
  },
  { format: 'DEFAULT' },
]

const upbit = new UpbitEmitter(upbitSubscribeMessage)

upbit.run()