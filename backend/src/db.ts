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
  // Drop idle connections after 5 minutes (well under MariaDB's default wait_timeout of 8h)
  idleTimeout: 300,
  // Timeout if acquiring a connection from the pool takes more than 10 seconds
  acquireTimeout: 10000,
});

export default pool;
