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
  // Test connections before handing them out; discards any the server has closed
  acquireTimeout: 10000,
  pingTimeout: 3000,
});

export default pool;
