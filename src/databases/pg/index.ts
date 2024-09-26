import { pool } from './dbConfig'
import {
  SymbolSchema,
  SymbolPriceSymbolSchema
} from './models'

export async function getAllSymbols(): Promise<SymbolSchema[]> {
  return read<SymbolSchema>('symbols')
}

// CRUD
export async function create<T extends object>(
  table: string,
  partial: Partial<T>[] | Partial<T>,
): Promise<void> {
  const client = await pool.connect()

  try {
    const { columnsStr, valuesStr, values } = getInsertList(partial)
    
    await client.query(
      `
      INSERT INTO ${table} (${columnsStr})
      VALUES ${valuesStr};
      `,
      values
    )
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

export async function read<T extends object>(
  table: string,
  columns?: string[],
  where?: { column: string; value: string | number | boolean }[]
): Promise<T[]> {
  const client = await pool.connect()

  const columnStr = columns ? columns.join(', ') : '*'
  const whereStr = where
  ? `WHERE ${where.map(({ column }, index) => `${column} = $${index + 1}`).join(' AND ')}`
  : ';' 
  
  try {
    const { rows } = await client.query(
      `
      SELECT ${columnStr}
      FROM ${table}
      ${whereStr}
      `,
      where?.map(({ value }) => value)
    )

    return rows
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

function getInsertList<T extends object>(
  partial: Partial<T>[] | Partial<T>
): {
  columnsStr: string
  valuesStr: string
  values: any[]
} {
  const isArray = Array.isArray(partial)

  if(!isArray) {
    const valuesStr = Object.keys(partial).map((_, idx) => `$${idx + 1}`).join(', ')
    
    return {
      columnsStr: Object.keys(partial).join(', '),
      valuesStr: `(${valuesStr})`,
      values: Object.values(partial),
    }
  }
  
  if(partial.length < 1) throw new Error('Partial array is empty')

  const column = Object.keys(partial[0])
  const values = partial.map(item => Object.values(item)).flat()
  const keyLength = column.length
  const emptyArray = new Array(keyLength).fill(0)
  const valuesStr = partial.map(
    (_, idx) => 
      `(${emptyArray.map((_, index) => `$${idx * keyLength + index + 1}`).join(', ')})`
  ).join(', ')

  return {
    columnsStr: column.join(', '),
    valuesStr,
    values
  }
}
