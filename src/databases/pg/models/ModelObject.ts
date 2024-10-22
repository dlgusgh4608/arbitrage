interface IQuery {
  query: string
  queryValues?: any[]
}

// Query: {
//   [key: string]: (payload: any) => IQuery
// }
// Exec: {
//   [key: string]: (payload: any) => Promise<any>
// }

export interface IModelObject { 
  Query: Record<string, (payload: any) => IQuery>
  Exec: Record<string, (payload: any) => Promise<any>>
}

export class ModelObject {
  constructor() {}

  protected generateInsertValues(payload: Record<string, any>[]): { keysStr: string, valuesStr: string, values: any[] } {
    const keys = Object.keys(payload[0])
    const keysStr = keys.join(', ')
    const valuesStr = payload.map(
      (_, idx) => `(
        ${keys.map((_, index) => `$${idx * keys.length + index + 1}`).join(', ')}
      )`
    ).join(', ')

    const values = payload.flatMap(item => Object.values(item))
    
    return { keysStr, valuesStr, values }
  }
}
