import EventEmitter from 'events';

interface Channel {
  bind(emitter: EventEmitter): void;
}

export class EventBroker {
  private emitter: EventEmitter = new EventEmitter();

  constructor() {}

  subscribe(channel: Channel): this {
    channel.bind(this.emitter);
    return this;
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  emit(event: string, payload: any): this {
    this.emitter.emit(event, payload)
    return this
  }
}

export type EventBrokerType = InstanceType<typeof EventBroker>