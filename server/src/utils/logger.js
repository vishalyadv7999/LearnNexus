const winston = require("winston");
const env = require("../config/env");

const logger = winston.createLogger({
  level: env.logLevel,
  defaultMeta: {
    service: "learnnexus-api",
    environment: env.nodeEnv,
  },
  format:
    env.nodeEnv === "production"
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "HH:mm:ss" }),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
            const metaText = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
            return `${timestamp} ${level}: ${stack || message}${metaText}`;
          })
        ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
