import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'AES-256-CBC'
const KEY = Buffer.from(process.env.EXCHANGE_ENCRYPTION_KEY_OF_HEX!, 'hex')

const generateIV = () => randomBytes(16)

export function encrypt(text: string) {
  const iv = generateIV()
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  cipher.update(text, 'utf8', 'hex')

  const encrypted = cipher.final('hex')
  return { iv: iv.toString('hex'), encryptedData: encrypted }
}

export function decrypt(encryptedData: string, iv: string) {
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'))
  decipher.update(encryptedData, 'hex', 'utf8')

  const decrypted = decipher.final('utf8')
  return decrypted
}
