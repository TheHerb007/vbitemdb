import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface AuthUser {
  username: string;
  passwordHash: string;
}

function parseAuthUsers(raw: string): AuthUser[] {
  if (!raw.trim()) return [];
  return raw.split(';').map(entry => {
    const colonIdx = entry.indexOf(':');
    if (colonIdx === -1) throw new Error(`Invalid AUTH_USERS format: ${entry}`);
    return {
      username: entry.slice(0, colonIdx),
      passwordHash: entry.slice(colonIdx + 1),
    };
  });
}

export const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiry: process.env.JWT_EXPIRY || '24h',
  },
  authUsers: parseAuthUsers(process.env.AUTH_USERS || ''),
  port: parseInt(process.env.PORT || '3001', 10),
};
