import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const dataDir = resolve(process.env.DATA_DIR || 'data');
mkdirSync(dataDir, { recursive: true });
mkdirSync(resolve(dataDir, 'videos'), { recursive: true });

const sqlite = new Database(resolve(dataDir, 'scrolly.db'));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Docker copies migrations to /app/migrations; dev uses src tree
const migrationsFolder = existsSync(resolve('migrations'))
	? resolve('migrations')
	: resolve('src/lib/server/db/migrations');

const startMs = Date.now();
migrate(db, { migrationsFolder });

const version = process.env.APP_VERSION || 'dev';
console.log(
	`[scrolly] v${version} started in ${Date.now() - startMs}ms | db: ${resolve(dataDir, 'scrolly.db')}`
);
