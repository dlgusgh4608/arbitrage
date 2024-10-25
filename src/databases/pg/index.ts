import { Pool } from 'pg'

const ssl = process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}

export const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB_NAME,
  ...ssl
})