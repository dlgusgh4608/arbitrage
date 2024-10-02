import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'

const ALGORITHM = 'AES-256-CBC'
const KEY = Buffer.from(process.env.EXCHANGE_ENCRYPTION_KEY_OF_HEX!, 'hex')

const generate16Byte = () => randomBytes(16)

export function encrypt(text: string) {
  const iv = generate16Byte()
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

export function generateHashPassword(
  password: string,
  salt: string = generate16Byte().toString('hex')
): { salt: string, hashedPassword: string } {
  const ITERATIONS = 1000
  const RETURN_BYTE = 64

  const passwordHashKey = process.env.PASSWORD_HASH_KEY!

  const joinedSalt = [passwordHashKey, salt].join(':')
  
  const hash = pbkdf2Sync(password, joinedSalt, ITERATIONS, RETURN_BYTE, 'sha512').toString('hex')

  return {
    salt: salt,
    hashedPassword: hash
  }
}

export function comparePassword(password: string, hash: string, salt: string): boolean {
  const { hashedPassword } = generateHashPassword(password, salt)
  
  return hashedPassword === hash
}
