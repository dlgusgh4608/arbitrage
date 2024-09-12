import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne
} from 'typeorm'

import { Symbol } from './Symbol'

@Entity('float_price')
export class FloatPrice {
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