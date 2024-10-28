import 'reflect-metadata'
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Keywords {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ type: 'varchar', length: 255 })
    name: string
}
