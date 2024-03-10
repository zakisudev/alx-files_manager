import { createClient } from 'redis';
import { promisify } from 'util';

/**
 * A Redis client class that can be used to interact with Redis.
 */
class RedisClient {
  constructor() {
    this.client = createClient();
    this.isConnected = false;

    this.client.on('error', (err) => {
      console.log('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.asyncSetX = promisify(this.client.setex).bind(this.client);
    this.asyncGet = promisify(this.client.get).bind(this.client);
    this.asyncDel = promisify(this.client.del).bind(this.client);
    this.asyncExpire = promisify(this.client.expire).bind(this.client);
  }

  isAlive() {
    return this.isConnected;
  }

  set(key, value, expiry) {
    this.asyncSetX(key, expiry, value);
  }

  get(key) {
    return this.asyncGet(key);
  }

  del(key) {
    return this.asyncDel(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
