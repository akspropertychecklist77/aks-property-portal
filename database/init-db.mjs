import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'portal.db');
const schemaPath = path.join(__dirname, 'd1-schema.sql');

console.log('🔄 Initializing local SQLite database for AKS Property Portal...');
console.log(`📁 Database path: ${dbPath}`);

const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

const schemaSql = fs.readFileSync(schemaPath, 'utf8');

// Execute SQL statements
db.exec(schemaSql);

console.log('✅ Schema and seed data successfully initialized in portal.db!');

// Verify tables created
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
console.log('📋 Verified Tables:', tables.map(t => t.name).join(', '));

// Verify cases seeded
const casesCount = db.prepare('SELECT COUNT(*) as count FROM cases;').get();
console.log(`📊 Seeded Cases: ${casesCount.count}`);

// Verify users seeded
const usersCount = db.prepare('SELECT COUNT(*) as count FROM users;').get();
console.log(`👤 Seeded Users: ${usersCount.count}`);

db.close();

