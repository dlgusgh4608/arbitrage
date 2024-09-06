import EventEmitter from 'events';

interface Channel {
  bind(emitter: EventEmitter): void;
}

export class EventBroker {
  #emitter: EventEmitter = new EventEmitter();

  constructor() {}

  subscribe(channel: Channel): this {
    channel.bind(this.#emitter);
    return this;
  }

  on(event: string | symbol, listener: (...args: any[]) => void): this {
    this.#emitter.on(event, listener);
    return this;
  }
}