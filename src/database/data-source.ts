import "reflect-metadata"
import { DataSource } from 'typeorm'
import {
  FloatPrice,
  IntegerPrice,
  Symbol
} from './entities'

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: process.env.NODE_END === 'development',
  entities: [
    FloatPrice,
    IntegerPrice,
    Symbol,
  ],
  subscribers: [],
  migrations: [],
})