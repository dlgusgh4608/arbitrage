import EventEmitter from 'events';
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

interface Channel {
  bind(emitter: EventEmitter): void;
}

class App {
  #emitter: EventEmitter = new EventEmitter();

  constructor() {}

  subscribe(channel: Channel): this {
    channel.bind(this.#emitter);
    return this;
  }

  on(event: string | symbol, listener: (...args: any[]) => void): this {
    this.#emitter.on(event, listener);
    return this;
  }
}

const upbit = new UpbitEmitter(upbitSubscribeMessage, 500)

const app = new App()

app.subscribe(upbit)

app.on('changePrice', (v) => console.log(JSON.stringify(v)))
app.on('updateOrderbook', v => console.log(JSON.stringify(v)))
app.on('error', v => console.log(v))

upbit.run()
upbit.emit()