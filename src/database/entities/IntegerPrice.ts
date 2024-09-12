import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne
} from 'typeorm'
import { Symbol } from './Symbol'

@Entity('integer_price')
export class IntegerPrice {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Symbol, symbol => symbol.id)
  symbol!: Symbol

  @Column('integer')
  open!: number

  @Column('integer')
  high!: number

  @Column('integer')
  low!: number

  @Column('integer')
  close!: number

  @Column('timestamp')
  created_at!: Date
}