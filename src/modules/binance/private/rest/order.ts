import axios from 'axios'
import { Auth } from './auth'
import type { IAuth } from '../types'

type TType = 'LIMIT' | 'MARKET'
type TSide = 'BUY' | 'SELL'
type TTimeInForce = 'IOC' | 'GTC' | 'GTD'

interface IOrderPayload {
  type: TType
  symbol: string
  side: TSide
  quantity?: number
  price?: number
  timeInForce: TTimeInForce
}

interface IOrder {
  clientOrderId: string;
  cumQty: string; // Cumulative quantity, stored as a string
  cumQuote: string; // Cumulative quote, stored as a string
  executedQty: string; // Executed quantity, stored as a string
  orderId: number; // Order ID
  avgPrice: string; // Average price, stored as a string
  origQty: string; // Original quantity, stored as a string
  price: string; // Price, stored as a string
  reduceOnly: boolean; // Indicates if it's a reduce-only order
  side: 'BUY' | 'SELL'; // Order side, can be 'BUY' or 'SELL'
  positionSide: 'LONG' | 'SHORT'; // Position side, can be 'LONG' or 'SHORT'
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED'; // Order status
  stopPrice?: string; // Stop price, optional (used only with certain order types)
  closePosition: boolean; // Indicates if it's a close-all order
  symbol: string; // Trading pair symbol
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'GTD'; // Time in force
  type: 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TRAILING_STOP_MARKET'; // Order type
  origType: 'LIMIT' | 'MARKET' | 'STOP_MARKET' | 'TRAILING_STOP_MARKET'; // Original order type
  activatePrice?: string; // Activation price, optional (only with TRAILING_STOP_MARKET)
  priceRate?: string; // Callback rate, optional (only with TRAILING_STOP_MARKET)
  updateTime: number; // Update timestamp
  workingType: 'CONTRACT_PRICE' | 'MARKET_PRICE'; // Working type
  priceProtect: boolean; // Indicates if price protection is enabled
  priceMatch: 'NONE' | 'MATCH' | 'PARTIAL'; // Price match mode
  selfTradePreventionMode: 'NONE' | 'DECREMENT' | 'CANCEL'; // Self-trading prevention mode
  goodTillDate: number; // Auto-cancel time for TIF GTD order
}

const ORDER_URL = 'https://fapi.binance.com/fapi/v1/order'

export class Order extends Auth {
  constructor(genTokenFunc: (body: { [key: string]: any }) => IAuth) {
    super(genTokenFunc)
  }

  private createValidator(
    type: TType,
    symbol: string,
    side: TSide,
    timeInForce: TTimeInForce,
    quantity?: number,
    price?: number,
  ): IOrderPayload {
    if(!symbol) throw new Error('Symbol is required')
    if(side !== 'BUY' && side !== 'SELL') throw new Error('Side is BUY or SELL')
    if(!type) throw new Error('Type is LIMIT or MARKET')
    if(!quantity) throw new Error('Quantity is required')

    if(type === 'LIMIT') {
      if(!price) throw new Error('If LIMIT type price required.')
      return { symbol, side, type, quantity, price, timeInForce }
    }else { 
      return { symbol, side, type, quantity, timeInForce } // MARKET
    }
  }
  
  async create(
    type: TType,
    symbol: string,
    side: TSide,
    quantity?: number,
    price?: number,
    timeInForce: TTimeInForce = 'GTC'
  ): Promise<IOrder> {
    try {
      const query = this.createValidator(type, symbol, side, timeInForce, quantity, price)
      const now = Date.now()
      
      const { apiKey, signature } = this.generateToken({ ...query, timestamp: now })

      const payload = {
        method: 'POST',
        url: ORDER_URL,
        headers: {
          'X-MBX-APIKEY': apiKey
        },
        params: signature
      }

      const { data } = await axios<IOrder>(payload)

      return data
    } catch (error) {
      throw error
    }
  }

  async cancel(symbol: string, orderId: number): Promise<IOrder> {
    try {
      if(!symbol) throw new Error('Symbol is required')
      if(!orderId) throw new Error('OrderId is required')

      const now = new Date()

      const { apiKey, signature } = this.generateToken({ symbol, orderId, timestamp: now })

      const payload = {
        method: 'DELETE',
        url: ORDER_URL,
        headers: {
          'X-MBX-APIKEY': apiKey
        },
        params: signature
      }

      const { data } = await axios<IOrder>(payload)

      return data
    } catch (error) {
      throw error
    }
  }

}