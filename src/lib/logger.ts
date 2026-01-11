type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLogLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVELS) {
    return env as LogLevel;
  }
  // Default: debug in development, info in production
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLogLevel()];
}

function formatError(error: unknown): LogEntry["error"] | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  const formattedError = formatError(error);
  if (formattedError) {
    entry.error = formattedError;
  }

  return entry;
}

function output(entry: LogEntry): void {
  const json = JSON.stringify(entry);

  switch (entry.level) {
    case "debug":
    case "info":
      console.log(json);
      break;
    case "warn":
      console.warn(json);
      break;
    case "error":
      console.error(json);
      break;
  }
}

/**
 * Structured logger for production use
 *
 * Outputs JSON-formatted logs with timestamp, level, message, and optional context.
 * In development, includes stack traces. In production, stack traces are omitted.
 *
 * Usage:
 *   logger.info("User logged in", { userId: "123" });
 *   logger.error("Failed to process", { transactionId: "abc" }, error);
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) {
      output(createLogEntry("debug", message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) {
      output(createLogEntry("info", message, context));
    }
  },

  warn(message: string, context?: LogContext, error?: unknown): void {
    if (shouldLog("warn")) {
      output(createLogEntry("warn", message, context, error));
    }
  },

  error(message: string, context?: LogContext, error?: unknown): void {
    if (shouldLog("error")) {
      output(createLogEntry("error", message, context, error));
    }
  },

  /**
   * Create a child logger with preset context
   * Useful for adding request-scoped context like userId or requestId
   */
  child(baseContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext, error?: unknown) =>
        logger.warn(message, { ...baseContext, ...context }, error),
      error: (message: string, context?: LogContext, error?: unknown) =>
        logger.error(message, { ...baseContext, ...context }, error),
    };
  },
};
