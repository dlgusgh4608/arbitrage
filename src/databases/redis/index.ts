import Redis, { ChainableCommander } from 'ioredis';

class List {
  #client: Redis
  #key: string

  constructor(key: string, client: Redis) {
    this.#client = client
    this.#key = key
  }
  
  async get<T extends object>(startIndex: number, endIndex: number): Promise<T[]> {
    try {
      const response = await this.#client.lrange(this.#key, startIndex, endIndex)
      return response.map((item) => JSON.parse(item)) as T[]
    } catch (error) {
      throw error
    }
  }
  
  async getAll<T extends object>(): Promise<T[]> {
    try {
      const response = await this.#client.lrange(this.#key, 0, -1)
      return response.map((item) => JSON.parse(item)) as T[]
    } catch (error) {
      throw error
    }
  }

  async push<T extends object>(data: T): Promise<number> {
    try {
      const response = await this.#client.rpush(this.#key, JSON.stringify(data))
      return response
    } catch (error) {
      throw error
    }
  }

  async unshift<T extends object>(data: T): Promise<number> {
    try {
      const response = await this.#client.lpush(this.#key, JSON.stringify(data))
      return response
    } catch (error) {
      throw error
    }
  }

  async shift<T extends object>(): Promise<T | null> {
    try {
      const response = await this.#client.lpop(this.#key)

      if (response === null) return null

      return JSON.parse(response)
    } catch (error) {
      throw error
    }
  }

  async pop<T extends object>(): Promise<T | null> {
    try {
      const response = await this.#client.rpop(this.#key)

      if (response === null) return null

      return JSON.parse(response)
    } catch (error) {
      throw error
    }
  }

  async popMultiple<T extends object>(count: number): Promise<T[]> {
    try {
      const result: T[] = [];

      for (let i = 0; i < count; i++) {
        const response = await this.shift<T>();
        if (response === null) break;

        result.push(response);
      }
      return result
    } catch (error) {
      throw error
    }
  }
  
  async delete() {
    try {
      await this.#client.del(this.#key)
    } catch (error) {
      throw error
    }
  }
}

class RedisClient {
  #client: Redis;

  constructor() {
    this.#client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async close(): Promise<void> {
    await this.#client.quit();
  }

  pipeline(): ChainableCommander {
    return this.#client.pipeline()
  }

  list(key: string): List {
    return new List(key, this.#client)
  }
}

export const redisClient = new RedisClient();