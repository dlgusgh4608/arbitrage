import { Telegram } from '@modules/telegram'

import type { IUserTradeWithEnv } from '@models/types'
import type { EventBrokerType } from '@modules/event-broker'

export class Alarm extends Telegram {
  private emitter: EventBrokerType
  
  constructor(userInfos:IUserTradeWithEnv[], emitter: EventBrokerType) {
    super(userInfos)
    this.emitter = emitter
  }

}