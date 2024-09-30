export interface UserEnvSchema {
    user_id: number
    exchange_id: number
    domestic_access_key: string
    domestic_access_iv: string
    domestic_secret_key: string
    domestic_secret_iv: string
    overseas_access_key: string
    overseas_access_iv: string
    overseas_secret_key: string
    overseas_secret_iv: string
    created_at: Date
    updated_at: Date
}