import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class Posts {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 255 })
  keyword: string

  @Column({ type: 'varchar', length: 255 })
  ariaLabelledBy: string

  @Column({ type: 'varchar', length: 255 })
  title: string

  @Column({ type: 'text' })
  link: string

  @Column({ type: 'text', nullable: true })
  content: string
}
