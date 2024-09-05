import _ from 'lodash'

export const roundTo = _.curry((to: number, num: number) => Math.round(num * (10 ** to)) / (10 ** to))

export const round = roundTo(0)
export const round4 = roundTo(4)

export const krwToUsd = (krw: number, exchangeRate: number) => round4(krw / exchangeRate)
export const usdToKrw = (usd: number, exchangeRate: number) => round(usd / exchangeRate)

export const getPremium = (upbit: number, binance: number) => round4((upbit / binance - 1) * 100)