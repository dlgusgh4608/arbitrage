import { pool } from '@databases/pg'

interface UserRoleSchema {
    id: number
    role: 'god' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'
}

const UserRole = {}

export type { UserRoleSchema }
export default UserRole