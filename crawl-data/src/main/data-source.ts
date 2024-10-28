import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Keywords } from './Entities/Keywords';
import { Posts } from './Entities/Posts';
import { ConvertPost } from './Entities/ConvertPost';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'crawl-data.sqlite',
  entities: [Keywords, Posts, ConvertPost],
  synchronize: true,
  logging: false,
});
