import { AppDataSource } from './data-source'
import {
  Symbol
} from './entities'

export async function connect() {
  try {
    await AppDataSource.initialize()
  } catch (error) {
    throw error
  }
}

export { Symbol as SymbolEntity }
export const getSymbolRepository = () => AppDataSource.getRepository(Symbol)