import IORedis from "ioredis";

let connection = null;

/**
 * Returns a singleton IORedis connection configured from env vars.
 * BullMQ requires maxRetriesPerRequest: null.
 */
export function getRedisConnection() {
  if (!connection) {
    const config = {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    connection = new IORedis(config);

    connection.on("connect", () => {
      console.log(">>>>> Redis connected successfully >>>>>");
    });

    connection.on("error", (err) => {
      console.error("Redis connection error:", err.message);
    });
  }

  return connection;
}
