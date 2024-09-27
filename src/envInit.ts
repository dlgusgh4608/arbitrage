import dotenv from 'dotenv'
import path from 'path'

export default ((): void => {
  if(process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.join(__dirname, '../.env.production') })
  }else {
    dotenv.config({ path: path.join(__dirname, '../.env.development') })
  }
})()