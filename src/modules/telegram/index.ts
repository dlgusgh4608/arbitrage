// TelegramBot.ts
import TelegramBot, { Message } from 'node-telegram-bot-api'
import { comparePassword } from '@utils/crypto'
import { isEmail } from '@utils/regex'
import { User } from '@models'

import type { IUserTradeWithEnv, UserSchema } from '@models/types'

interface IUserChatInfo {
  [userId: string]: number
}

interface IAccountUser {
  [chatId: string]: {
    step: number
    userInfo?: UserSchema
  }
}

const WELCOME_MESSAGE = [
  `[Arbitrage 자동거래 메세지 시스템입니다]`,
  `메세지 서비스를 사용하고싶은 계정의`,
  `아이디와 비밀번호를 입력하여`,
  `메시지 서비스를 등록할 수 있습니다.`,
  ``,
  `등록을 진행하시려면 채팅창에`,
  `"/account"를 입력해주시길 바랍니다.`,
  ``,
  `이 문구를 다시 보고싶으시다면`,
  `채팅창에 "/start"를 입력해주시길 바랍니다.`,
].join(`\n`)
const EMAIL_MESSAGE = `이메일을 입력 해주시길 바랍니다.`
const INVALID_EMAIL = `이메일 형식이 올바르지 않습니다.`
const NOT_FOUND_EMAIL = `해당 이메일을 찾을 수 없습니다.`
const FOUND_TEL_ID_BY_EMAIL = [
  `해당 이메일은 이미 메세지 서비스가 등록되어있습니다.`,
  `수정하시겠습니까?`,
  `수정을 진행하시려면 Y`,
  `수정을 진행하지 않으시려면 N`,
  `을 입력해주세요.`
].join(`\n`)
const EMAIL_SUCCESS_RETURN_MESSAGE = [
  `성공적으로 입력 받았습니다.`,
  `이어서 비밀번호를 입력 해주시길 바랍니다.`,
].join(`\n`)
const INVALID_PASSWORD = `올바르지 않은 비밀번호 입니다.`
const RETURN_BEGIN = `설정을 종료합니다.`
const SUCCESS_PROCESS = [
  `성공적으로 계정이 등록되었습니다.`,
  `감사합니다.`
].join(`\n`)

const STEP_TABLE = {
  'RECEIVE_EMAIL': 1,
  'ALREADY_EMAIL': 2,
  'RECEIVE_PASSWORD': 3,
  'SUCCESS': 4,
}

export class Telegram {
  private bot: TelegramBot
  private users: IUserChatInfo
  private accountUsers: IAccountUser = {}

  constructor(userInfos: IUserTradeWithEnv[]) {
    this.bot = new TelegramBot(process.env.TEL_BOT_TOKEN!, { polling: true })

    this.users = userInfos.reduce((acc, obj) => {
      if(obj.telegram_id) {
        return { ...acc, [obj.user_id]: obj.telegram_id }
      }else {
        return { ...acc }
      }
    }, {})

    this.bot.on('message', (msg: Message) => {
      const chatId = msg.chat.id
      const user = this.accountUsers[chatId]

      if(!user) return

      const { step } = user

      if(step === 1) return this.handleReceiveEmail(msg)

      if(step === 2) return this.handleReceiveAgree(msg)

      if(step === 3) return this.handleReceivePassword(msg)

      return
    })

    // Listen for messages
    this.bot.onText(/\/start/, (msg: Message) => {
      this.sendMessageByChatId(msg.chat.id, WELCOME_MESSAGE)  
    })

    this.bot.onText(/\/account/, (msg: Message) => {
      const chatId = msg.chat.id
      this.accountUsers[chatId] = { step: STEP_TABLE.RECEIVE_EMAIL }
      this.sendMessageByChatId(chatId, EMAIL_MESSAGE)
    })
  }

  private async handleReceiveEmail(msg: Message) {
    const chatId = msg.chat.id
    const message = msg.text
    try {
      const user = this.accountUsers[chatId]
      
      if(!message || !message.match(isEmail)) {
        await this.sendMessageByChatId(chatId, INVALID_EMAIL)
        delete this.users[chatId]
        return
      }

      const userInfo = await User.Exec.findByEmail(message)

      if(!userInfo) {
        await this.sendMessageByChatId(chatId, NOT_FOUND_EMAIL)
        delete this.accountUsers[chatId]
        return
      }

      user.userInfo = userInfo

      if(userInfo.telegram_id) {
        await this.sendMessageByChatId(chatId, FOUND_TEL_ID_BY_EMAIL)
        user.step = 2
        return
      }
    
      await this.sendMessageByChatId(chatId, EMAIL_SUCCESS_RETURN_MESSAGE)
      user.step = 3
    } catch (error) {
      delete this.accountUsers[chatId]
      throw error
    }
  }

  private async handleReceiveAgree(msg: Message) {
    const chatId = msg.chat.id
    const message = msg.text!
    try {
      const user = this.accountUsers[chatId]

      const lowerMsg = message?.toLowerCase()

      const yesArr = ['y', 'yes', 'yep', 'yea', 'yeah', 'ok', 'okay']

      if(yesArr.some(yes => yes === lowerMsg)) {
        await this.sendMessageByChatId(chatId, EMAIL_SUCCESS_RETURN_MESSAGE)
        user.step = 3
      }else {
        await this.sendMessageByChatId(chatId, RETURN_BEGIN)
        delete this.accountUsers[chatId]
      }
    } catch (error) {
      delete this.accountUsers[chatId]
      throw error
    }
  }

  private async handleReceivePassword(msg: Message) {
    const chatId = msg.chat.id
    const message = msg.text!
    try {
      const user = this.accountUsers[chatId]

      const { password, salt, id } = user.userInfo!

      if(!comparePassword(message, password, salt)) {
        await this.sendMessageByChatId(chatId, INVALID_PASSWORD)
      }else {
        await User.Exec.updateTelId({ user_id: id, telegram_id: String(chatId) })
        await this.sendMessageByChatId(chatId, SUCCESS_PROCESS)
        this.users[id] = chatId
      }

      delete this.accountUsers[chatId]
    } catch (error) {
      delete this.accountUsers[chatId]
      throw error
    }
  }

  protected async sendErrorMessage(error: any) {
    try {
      const errorToString = typeof error === 'object' ? JSON.stringify(error) : error.toString()
      this.bot.sendMessage(Number(process.env!.TEL_CHAT_ID), errorToString)  
    } catch (error) {
      process.exit(1)
    }
  }
  
  protected async sendMessageByUserId(userId: number, text: string): Promise<void> {
    try {
      const chatId = this.users[userId]

      if(!chatId) return this.sendErrorMessage(text)

      await this.sendMessageByChatId(chatId, text)
    } catch (error) {
      this.sendErrorMessage(error)
    }
  }

  private async sendMessageByChatId(chatId: number, text: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, text)  
    } catch (error: any) {
      throw error
    }
  }
}