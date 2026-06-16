import "server-only";

import { Pool, type PoolClient, type QueryConfig, type QueryResult, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Example: postgresql://prelize_user:<password>@203.18.158.140:5432/prelize");
}

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const connectionTimeoutMillis = readPositiveIntegerEnv("DATABASE_CONNECTION_TIMEOUT_MS", 10_000);
const queryRetryCount = readPositiveIntegerEnv("DATABASE_QUERY_RETRIES", 2);
const queryRetryDelayMillis = readPositiveIntegerEnv("DATABASE_QUERY_RETRY_DELAY_MS", 250);

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis,
    keepAlive: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

function isConnectionTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("timeout exceeded when trying to connect") ||
    error.message.includes("Connection terminated due to connection timeout")
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string | QueryConfig,
  values?: unknown[],
): Promise<QueryResult<T>> {
  for (let attempt = 0; attempt <= queryRetryCount; attempt += 1) {
    try {
      return await pool.query<T>(text, values);
    } catch (error) {
      if (!isConnectionTimeoutError(error) || attempt === queryRetryCount) {
        throw error;
      }

      await wait(queryRetryDelayMillis * (attempt + 1));
    }
  }

  throw new Error("Database query retry loop exited unexpectedly.");
}

export async function connect(): Promise<PoolClient> {
  for (let attempt = 0; attempt <= queryRetryCount; attempt += 1) {
    try {
      return await pool.connect();
    } catch (error) {
      if (!isConnectionTimeoutError(error) || attempt === queryRetryCount) {
        throw error;
      }

      await wait(queryRetryDelayMillis * (attempt + 1));
    }
  }

  throw new Error("Database connection retry loop exited unexpectedly.");
}
