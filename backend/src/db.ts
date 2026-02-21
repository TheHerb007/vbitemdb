import mariadb from 'mariadb';
import { config } from './config';

const pool = mariadb.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: 10,
  insertIdAsNumber: true,
  bigIntAsNumber: true,
});

export default pool;
