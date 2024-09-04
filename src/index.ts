import EventEmitter from 'events';
import {
  Upbit,
  Binance
} from './modules'

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

async function main() {
  try {
    const coins = ['btc', 'eth']
    const intervalTime = 500

    const app = new App()
    const upbit = new Upbit(coins, intervalTime)
    const binance = new Binance(coins, intervalTime)

    app
      .on('changePrice', obj => {
        // trade data
      })
      .on('updateOrderbook', obj => {
        // orderbook data
      })
      .on('error', obj => {
        // error data
      })

    app.subscribe(upbit).subscribe(binance)

    upbit.run()
    binance.run()
    
    upbit.emit()
    binance.emit()

  } catch (error) {
    console.error(error)
  }
}