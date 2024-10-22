// TelegramBot.ts
import TelegramBot from 'node-telegram-bot-api'

class MyTelegramBot {
  private bot: TelegramBot

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true })

    // Listen for messages
    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id
      this.sendMessage(chatId, 'Hello! I received your message.')
    })
  }

  public sendMessage(chatId: number, text: string): void {
    this.bot.sendMessage(chatId, text)
      .then(() => console.log('Message sent:', text))
      .catch((err) => console.error('Error sending message:', err))
  }
}

// Example usage
const botToken = '7321088799:AAGPjjYk7OeKXAlPP8uWbzeFP9BamO-jhm4' // 이거는 테스트채팅방 나중에 env로 옮김
const myBot = new MyTelegramBot(botToken)

myBot.sendMessage(1234512345, '안녕하세요~')