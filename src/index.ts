import './envInit' // dotenv initialize

import { initializeDatabase } from './databases/pg/connect'
import { Symbol } from '@models'

import { Collector } from './apps/collector'
import { Archive } from './apps/archive'
import EventEmitter from 'events'

// import { BinancePrivate } from '@modules/binance/private'

async function main() {
  try {
    await initializeDatabase()
    
    const symbols = await Symbol.Exec.find()

    const coreEmitter = new EventEmitter()
    const collector = new Collector(coreEmitter, symbols)
    const archive = new Archive(coreEmitter, symbols)

    collector.run()
    archive.run()
  } catch (error) {
    console.error(error)
  }
}

main()