export interface UserRoleSchema {
    id: number
    role: 'god' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'
}