import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../../src/lib/server/db/schema';
import { resolve } from 'path';

export function createTestDb() {
	const sqlite = new Database(':memory:');
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');

	const db = drizzle(sqlite, { schema });

	const migrationsFolder = resolve('src/lib/server/db/migrations');
	migrate(db, { migrationsFolder });

	return { db, sqlite };
}

export type TestDb = ReturnType<typeof createTestDb>['db'];
