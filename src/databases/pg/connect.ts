import fs from 'fs'
import path from 'path'
import { pool, tempPool } from './dbConfig'

const initSQL = fs.readFileSync(path.join(__dirname, 'pgInit.sql'), 'utf8')

// initialize database
async function checkExistsDatabase() {
  try {
    const tempClient = await tempPool.connect()

    const dbExistsResult = await tempClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.PG_DB_NAME]
    )

    if (dbExistsResult.rows.length === 0) {
      console.log(`[PostgreSQL]\tdatabase is not exists (${process.env.PG_DB_NAME})`)
      await tempClient.query(`CREATE DATABASE ${process.env.PG_DB_NAME}`)
      console.log(`[PostgreSQL]\tdatabase is created (${process.env.PG_DB_NAME})`)
    }else {
      console.log(`[PostgreSQL]\tfind database (${process.env.PG_DB_NAME})`)
    }

    tempClient.release()
    await tempPool.end()
  } catch (error) {
    throw error
  }
}
export async function initializeDatabase() {
  try {
    await checkExistsDatabase()
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