import './envInit' // dotenv initialize

import { initializeDatabase } from './databases/pg/connect'
import { Symbol, User } from '@models'

import { UsdToKrw } from '@modules/exchange-rate/usd-to-krw'
import { EventBroker } from '@modules/event-broker'

import { Collector } from './apps/collector'
import { Archive } from './apps/archive'
import { Order } from './apps/order'
import { Alarm } from './apps/alarm'

const EXCHANGE_RATE_INTERVAL_TIME_TO_SEC = 10

async function main() {
  try {
    await initializeDatabase() // PostgreSQL에 테이블이 있는지 검사하고 없으면 생성.
    
    const symbols = await Symbol.Exec.find()
    const usersWithEnv = await User.Exec.findWithEnv()

    const usdToKrw = new UsdToKrw(EXCHANGE_RATE_INTERVAL_TIME_TO_SEC)
    const coreEmitter = new EventBroker()

    coreEmitter.subscribe(usdToKrw)

    usersWithEnv.forEach(userWithEnv => {
      const order = new Order(coreEmitter, userWithEnv)
      order.run()
    })
    
    const alarm = new Alarm(usersWithEnv, coreEmitter)
    const collector = new Collector(coreEmitter, symbols)
    const archive = new Archive(coreEmitter, symbols)

    alarm.run()
    collector.run()
    archive.run()

    usdToKrw.run() // 제일 마지막에 실행해야함.
  } catch (error) {
    console.error(error)
  }
}

main()