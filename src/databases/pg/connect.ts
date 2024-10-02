import fs from 'fs'
import path from 'path'
import { pool } from './index'

const initSQL = fs.readFileSync(path.join(__dirname, 'pgInit.sql'), 'utf8')

// initialize database
export async function initializeDatabase() {
  try {
    const client = await pool.connect()

    await client.query(initSQL)
    console.log(`[PostgreSQL]\tdatabase is initialized (${process.env.PG_DB_NAME})`)

    client.release()
    console.log(`[PostgreSQL]\tdatabase is connected (${process.env.PG_DB_NAME})`)
  } catch (error) {
    console.error(`[PostgreSQL]\tdatabase is not connected (${process.env.PG_DB_NAME})`, error)
    process.exit(1)
  }
}