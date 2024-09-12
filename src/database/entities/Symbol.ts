import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity('symbol')
export class Symbol {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  name!: string

  @Column()
  exchange!: string

  @Column()
  currency!: string

  @CreateDateColumn()
  created_at!: Date
}