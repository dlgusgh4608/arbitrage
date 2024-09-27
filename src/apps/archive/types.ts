import type { Premium } from '../collector/types'

interface PremiumRedisBufferData extends Premium {
  createdAt: Date
}

export type { PremiumRedisBufferData }
