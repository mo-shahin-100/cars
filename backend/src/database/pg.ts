import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Determine connection settings
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/workshop_db';
const isCloudOrSsl = connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co');

const poolConfig: PoolConfig = {
  connectionString,
  ssl: isCloudOrSsl ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pgPool = new Pool(poolConfig);

// Helper to convert '?' placeholders to PostgreSQL '$1', '$2', '$3'
export function convertPlaceholders(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export async function testPostgresConnection(): Promise<boolean> {
  try {
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (err: any) {
    console.warn(`[PostgreSQL] Connection test failed: ${err.message}`);
    return false;
  }
}

export async function initPostgresDatabase() {
  const schemaPath = path.join(__dirname, 'schema.postgres.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pgPool.connect();
  try {
    console.log('[PostgreSQL] Executing schema migrations...');
    await client.query(schemaSql);
    console.log('[PostgreSQL] Schema successfully initialized.');
  } finally {
    client.release();
  }
}

export const pgDb = {
  pool: pgPool,
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  },
  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0] || null;
  },
  async run(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, params);
    return { rowCount: res.rowCount || 0 };
  }
};

export default pgDb;
