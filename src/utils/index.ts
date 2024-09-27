import _ from 'lodash'
import dayjs from 'dayjs'

export const roundTo = _.curry((to: number, num: number) => Math.round(num * (10 ** to)) / (10 ** to))

export const round = roundTo(0)
export const round4 = roundTo(4)

export const krwToUsd = (krw: number, exchangeRate: number) => round4(krw / exchangeRate)
export const usdToKrw = (usd: number, exchangeRate: number) => round(usd / exchangeRate)

export const getPremium = (upbit: number, binance: number) => round4((upbit / binance - 1) * 100)

export const getTimeDifference = (domestic: Date | number, overseas: Date | number) => dayjs(domestic).diff(dayjs(overseas), 's')

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function removeUndefinedInObject(obj: { [key: string]: any }) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined))
}
