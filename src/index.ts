import dotenv from 'dotenv'
import path from 'path'
if(process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env.production') })
}else {
  dotenv.config({ path: path.join(__dirname, '../.env.development') })
}

import { connect } from './database'
import { Collector } from './apps/collector'
import { Archive } from './apps/archive'
import EventEmitter from 'events'

async function main() {
  try {
    await connect()

    const coreEmitter = new EventEmitter()
    const collector = new Collector(coreEmitter)
    const archive = new Archive(coreEmitter)

    archive.run()
    collector.run()
  } catch (error) {
    console.error(error)
  }
}

main()


