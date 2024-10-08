import type { IAuth } from '../types'

export class Auth {
  protected generateToken: (body: { [key: string]: any }) => IAuth

  constructor(genTokenFunc: (body: { [key: string]: any }) => IAuth) {
    this.generateToken = genTokenFunc
  }
}