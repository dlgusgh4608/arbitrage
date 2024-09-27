interface ITokens {
  accessKey: string
  secretKey: string
}

interface IAuth {
  apiKey: string
  signature: { [key: string]: any }
}

export type { ITokens, IAuth }