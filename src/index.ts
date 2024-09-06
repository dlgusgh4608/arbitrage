import EventEmitter from 'events'
import { Collector } from './apps/collector'

const centerEmitter = new EventEmitter()

const collector = new Collector(centerEmitter)

collector.run()