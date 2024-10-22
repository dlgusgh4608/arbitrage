import _ from 'lodash'
import dayjs from 'dayjs'

export const roundTo = _.curry((to: number, num: number) => Math.round(num * (10 ** to)) / (10 ** to))
export const round = roundTo(0)
export const round2 = roundTo(2)
export const round4 = roundTo(4)
export const round8 = roundTo(8)
export const round12 = roundTo(16)

export const floorTo = _.curry((to: number, num: number) => Math.floor(num * (10 ** to)) / (10 ** to))
export const floor = floorTo(0)
export const floor2 = floorTo(2)
export const floor4 = floorTo(4)
export const floor8 = floorTo(8)
export const floor12 = floorTo(16)

export const ceilTo = _.curry((to: number, num: number) => Math.ceil(num * (10 ** to)) / (10 ** to))
export const ceil = ceilTo(0)
export const ceil2 = ceilTo(2)
export const ceil4 = ceilTo(4)
export const ceil8 = ceilTo(8)
export const ceil12 = ceilTo(16)

export const krwToUsd = (krw: number, exchangeRate: number) => round4(krw / exchangeRate)
export const usdToKrw = (usd: number, exchangeRate: number) => round(usd * exchangeRate)

export const getPremium = (domestic: number, overseas: number) => round4((domestic / overseas - 1) * 100)

export const getTimeDifference = (domestic: Date | number, overseas: Date | number) => dayjs(domestic).diff(dayjs(overseas), 's')

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function removeUndefinedInObject(obj: { [key: string]: any }) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined))
}

export const getKneeValue = (max: number, min: number) => round4(min + (max - min) * 0.25)
export const getShoulderValue = (max: number, min: number) => round4(max - (max - min) * 0.25)

export const getPercent = (total: number, part: number) => round4(total / part * 100)
export const calcPercentOf = (amount: number, percent: number, round: number = 0) => roundTo(round)((percent / 100) * amount)