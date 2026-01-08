import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';

// 1. Setup the connection pool (Better for performance)
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

// 2. Initialize the adapter
const adapter = new PrismaMariaDb(pool);

// 3. Create the client with the adapter
const prisma = new PrismaClient({ adapter });

export default prisma;