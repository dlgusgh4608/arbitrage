import WebSocket from "ws";
import EventEmitter from "events";
import dayjs from "dayjs";

const BINANCE_URL: string = 'wss://fstream.binance.com/stream?streams=' // example "wss://fstream.binance.com/stream?streams=bnbusdt@aggTrade/btcusdt@markPrice"

interface AggTradeOriginal {
  e: "aggTrade"    // Event type, which is a literal type
  E: number        // Event time, which is a number
  s: string        // Symbol, which is a string
  a: number        // Aggregate trade ID, which is a number
  p: string        // Price, which is a string
  q: string        // Quantity, which is a string
  f: number        // First trade ID, which is a number
  l: number        // Last trade ID, which is a number
  T: number        // Trade time, which is a number
  m: boolean        // Is the buyer the market maker?, which is a boolean
}
interface AggTrade {
  from: 'binance';
  type: "aggTrade";
  eventTime: number;
  symbol: string;
  aggregateTradeId: number;
  price: string;
  quantity: string;
  firstTradeId: number;
  lastTradeId: number;
  tradeTime: number;
  isMarketMaker: boolean;
}

interface OrderbookOriginal {
  e: "depthUpdate";   // Event type, which is a literal type
  E: number;         // Event time, which is a number
  T: number;         // Transaction time, which is a number
  s: string;         // Symbol, which is a string
  U: number;         // First update ID, which is a number
  u: number;         // Final update ID, which is a number
  pu: number;        // Previous update ID, which is a number
  b: [string, string][]; // Bids to be updated, an array of arrays with string values
  a: [string, string][]; // Asks to be updated, an array of arrays with string values
}
interface Orderbook {
  from: 'binance';
  type: "depthUpdate";
  eventTime: number;
  transactionTime: number;
  symbol: string;
  firstUpdateID: number;
  finalUpdateID: number;
  previousUpdateID: number;
  bids: Order[];
  asks: Order[];
}
interface Order {
  price: number,
  quantity: number
}

class Binance {
  #ws: WebSocket
  #run: boolean = false
  #url: string = ''

  #trade: AggTrade | undefined
  #orderbook: Orderbook | undefined

  #emitterOut: EventEmitter | undefined
  #emitInterval: number = 500

  constructor(coins: string[], emitInterval: number = 500) {
    const streamParams: string = [
      ...coins.map(coin => [coin.toLowerCase().concat('usdt'), 'aggTrade'].join('@')),
      ...coins.map(coin => [coin.toLowerCase().concat('usdt'), 'depth10@100ms'].join('@')),
    ].join('/')

    const url: string = BINANCE_URL.concat(streamParams)
    
    this.#emitInterval = emitInterval
    this.#url = url

    this.#ws = new WebSocket(url)
  }

  #open() {
    this.#ws.on('open', () => {
      console.log('Binance WebSocket Connected')
    })
  }

  #transformAggTrade(original: AggTradeOriginal): AggTrade {
    return {
      from: 'binance',
      type: original.e,
      eventTime: original.E,
      symbol: original.s,
      aggregateTradeId: original.a,
      price: original.p,
      quantity: original.q,
      firstTradeId: original.f,
      lastTradeId: original.l,
      tradeTime: original.T,
      isMarketMaker: original.m
    };
  }

  #transformOrderbook(original: OrderbookOriginal): Orderbook {
    return {
      from: 'binance',
      type: original.e,
      eventTime: original.E,
      transactionTime: original.T,
      symbol: original.s,
      firstUpdateID: original.U,
      finalUpdateID: original.u,
      previousUpdateID: original.pu,
      bids: original.b.map(([price, quantity]) => ({ price: Number(price), quantity: Number(quantity) })),
      asks: original.a.map(([price, quantity]) => ({ price: Number(price), quantity: Number(quantity) }))
    };
  }

  #handleMessage = (message: Buffer) => {
    try {
      const jsonData: AggTradeOriginal | OrderbookOriginal = JSON.parse(message.toString()).data

      if(jsonData.e === 'aggTrade') {
        this.#trade = this.#transformAggTrade(jsonData)
      }else if(jsonData.e === 'depthUpdate') {
        this.#orderbook = this.#transformOrderbook(jsonData)
      }else {
        throw new Error('Received message type is invalid')
      }
    } catch (error) {
      console.error(error)
    }
  }

  #receiveMessage() { this.#ws.on('message', this.#handleMessage) }

  #reallocation() {
    this.#ws = new WebSocket(this.#url)
    this.#run = false
    this.#trade = undefined
    this.#orderbook = undefined
  }

  #ping() {
    this.#ws.on('ping', (e: Buffer) => {
      console.log(`[${dayjs(Number(e.toString())).format('YYYY-MM-DD HH-mm:ss')}]\tPing!`)
      this.#ws.pong()
    })
  }

  close() { this.#ws.close() }

  bind(emitter = new EventEmitter()) { this.#emitterOut = emitter }

  emit() {
    setInterval(() => {
      if(this.#emitterOut) {
        this.#emitterOut.emit('changePrice', Object.freeze(this.#trade))
        this.#emitterOut.emit('updateOrderbook', Object.freeze(this.#orderbook))
      }
    }, this.#emitInterval)
  }

  run(restart: boolean = true) {
    try {
      if (this.#run) throw new Error('This socket is already running!')
      this.#run = true

      this.#receiveMessage()

      this.#ping()

      this.#ws.on('close', () => {
        console.log('Binance WebSocket Disconnected')
        this.#reallocation()

        if(restart) this.run(restart)
      })

      this.#open()
    } catch (error) {
      throw error
    }
  }
}

export default Binance