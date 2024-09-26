import dotenv from 'dotenv'
import path from 'path'
if(process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env.production') })
}else {
  dotenv.config({ path: path.join(__dirname, '../.env.development') })
}

import { initializeDatabase } from './databases/pg/connect'
import { getAllSymbols } from './databases/pg'

import { Collector } from './apps/collector'
import { Archive } from './apps/archive'
import EventEmitter from 'events'

async function main() {
  try {
    await initializeDatabase()

    const symbols = await getAllSymbols()

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