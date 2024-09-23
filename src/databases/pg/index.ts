import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

const initSQL = fs.readFileSync(path.join(__dirname, 'pgInit.sql'), 'utf8')

export const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB_NAME,
})

async function checkExistsDatabase() {
  try {
    const tempPool = new Pool({
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT || '5432'),
      user: process.env.PG_USERNAME,
      password: process.env.PG_PASSWORD,
      database: 'postgres',
    })

    const tempClient = await tempPool.connect()

    const dbExistsResult = await tempClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [process.env.DB_NAME]
    )

    if (dbExistsResult.rows.length === 0) {
      console.log(`database is not exists DB_NAME: ${process.env.DB_NAME}`)
      await tempClient.query(`CREATE DATABASE ${process.env.DB_NAME}`)
      console.log(`database is created DB_NAME: ${process.env.DB_NAME}`)
    }else {
      console.log(`find database DB_NAME: ${process.env.DB_NAME}`)
    }

    tempClient.release()
    await tempPool.end()
  } catch (error) {
    throw error
  }
}

export const initializeDatabase = async () => {
  try {
    await checkExistsDatabase()
    const client = await pool.connect()
    console.log(`database is connected DB_NAME: ${process.env.DB_NAME}`)

    await client.query(initSQL)
    console.log('database is initialized')

    client.release()
  } catch (error) {
    console.error('database is not connected:', error)
    process.exit(1)
  }
}