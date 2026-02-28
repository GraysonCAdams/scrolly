import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createLogger } from '$lib/server/logger';

const dataDir = resolve(process.env.DATA_DIR || 'data');
/* eslint-disable security/detect-non-literal-fs-filename */
mkdirSync(dataDir, { recursive: true });
mkdirSync(resolve(dataDir, 'videos'), { recursive: true });
mkdirSync(resolve(dataDir, 'providers'), { recursive: true });
/* eslint-enable security/detect-non-literal-fs-filename */

const log = createLogger('db');

export const sqlite = new Database(resolve(dataDir, 'scrolly.db'));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Docker copies migrations to /app/migrations; dev uses src tree
const migrationsFolder = existsSync(resolve('migrations'))
	? resolve('migrations')
	: resolve('src/lib/server/db/migrations');

const startMs = Date.now();
migrate(db, { migrationsFolder });

// Backfill shortcut tokens for existing groups that don't have one
import { isNull, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

const groupsWithoutToken = db
	.select({ id: schema.groups.id })
	.from(schema.groups)
	.where(isNull(schema.groups.shortcutToken))
	.all();

for (const g of groupsWithoutToken) {
	db.update(schema.groups).set({ shortcutToken: uuid() }).where(eq(schema.groups.id, g.id)).run();
}

const version = process.env.APP_VERSION || 'dev';
log.info(
	{ version, startupMs: Date.now() - startMs, dbPath: resolve(dataDir, 'scrolly.db') },
	`v${version} started in ${Date.now() - startMs}ms`
);
