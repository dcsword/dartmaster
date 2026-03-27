import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const migrationsPath = path.join(__dirname, 'all_migrations.sql');
  const sql = await readFile(migrationsPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log(`Applying migrations from ${migrationsPath}`);
    await client.query(sql);
    console.log('Database migrations completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
