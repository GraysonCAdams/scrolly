import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
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

// Back up database before running migrations
const dbPath = resolve(dataDir, 'scrolly.db');
const backupDir = resolve(dataDir, 'backups');
/* eslint-disable security/detect-non-literal-fs-filename */
mkdirSync(backupDir, { recursive: true });

if (existsSync(dbPath)) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupPath = resolve(backupDir, `scrolly-${timestamp}.db`);
	try {
		copyFileSync(dbPath, backupPath);
		log.info({ backupPath }, 'Pre-migration backup created');
	} catch (err) {
		log.warn({ err }, 'Pre-migration backup failed — continuing without backup');
	}
}
/* eslint-enable security/detect-non-literal-fs-filename */

const startMs = Date.now();
migrate(db, { migrationsFolder });

// Backfill shortcut tokens for existing groups that don't have one
import { isNull, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import crypto from 'node:crypto';

const groupsWithoutToken = db
	.select({ id: schema.groups.id })
	.from(schema.groups)
	.where(isNull(schema.groups.shortcutToken))
	.all();

for (const g of groupsWithoutToken) {
	db.update(schema.groups).set({ shortcutToken: uuid() }).where(eq(schema.groups.id, g.id)).run();
}

// Auto-create the group on first run if the database is empty
const groupCount = db.select({ id: schema.groups.id }).from(schema.groups).limit(1).all();
if (groupCount.length === 0) {
	const groupId = uuid();
	const inviteCode = crypto.randomBytes(4).toString('hex');

	db.insert(schema.groups)
		.values({
			id: groupId,
			name: process.env.GROUP_NAME || 'Scrolly',
			inviteCode,
			shortcutToken: uuid(),
			createdAt: new Date()
		})
		.run();

	const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
	const joinLink = `${appUrl}/join/${inviteCode}`;
	log.info('');
	log.info('========================================');
	log.info('  First-time setup: group created!');
	log.info(`  Join as host: ${joinLink}`);
	log.info('========================================');
	log.info('');
}

const version = process.env.APP_VERSION || 'dev';
log.info(
	{ version, startupMs: Date.now() - startMs, dbPath: resolve(dataDir, 'scrolly.db') },
	`v${version} started in ${Date.now() - startMs}ms`
);
