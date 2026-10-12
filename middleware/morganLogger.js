import path from "path";
import { fileURLToPath } from "url";
import { createStream } from "rotating-file-stream";
import morgan from "morgan";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirectory = path.join(__dirname, "..", "logs");

const pad = (num) => (num > 9 ? "" : "0") + num;

const generator = (time, index) => {
  const d = time || new Date();
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `access-${year}-${month}-${day}.log`;
};

// Daily rotating write stream: rotates every day, retains 14 days of logs
export const accessLogStream = createStream(generator, {
  interval: "1d",
  path: logDirectory,
  maxFiles: 14,
});

// Console logger: colored 'dev' format in development, 'combined' in production
export const consoleLogger = morgan(
  process.env.NODE_ENV === "production" ? "combined" : "dev"
);

// File logger: standard Apache 'combined' format written to daily rotating file stream
export const fileLogger = morgan("combined", {
  stream: accessLogStream,
});

/**
 * Mounts both console and file Morgan loggers on the Express application.
 * @param {import("express").Application} app
 */
export const setupLogging = (app) => {
  app.use(consoleLogger);
  app.use(fileLogger);
};

export default setupLogging;
