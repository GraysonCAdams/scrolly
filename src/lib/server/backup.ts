import { resolve } from 'path';
import { readdir, unlink, mkdir, stat } from 'fs/promises';
import { sqlite } from '$lib/server/db';
import { createLogger } from '$lib/server/logger';

const log = createLogger('backup');

const DATA_DIR = resolve(process.env.DATA_DIR || 'data');
const BACKUP_DIR = resolve(DATA_DIR, 'backups');
const BACKUP_RETENTION_COUNT = parseInt(process.env.BACKUP_RETENTION_COUNT || '7', 10);

async function pruneOldBackups(): Promise<void> {
	try {
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		const files = await readdir(BACKUP_DIR);
		const backupFiles = files
			.filter((f) => f.startsWith('scrolly-') && f.endsWith('.db'))
			.sort()
			.reverse(); // Newest first (ISO timestamps sort lexicographically)

		const toDelete = backupFiles.slice(BACKUP_RETENTION_COUNT);

		for (const file of toDelete) {
			const filePath = resolve(BACKUP_DIR, file);
			// eslint-disable-next-line security/detect-non-literal-fs-filename
			await unlink(filePath);
			log.info({ file }, 'pruned old backup');
		}

		if (toDelete.length > 0) {
			log.info(
				{ pruned: toDelete.length, kept: BACKUP_RETENTION_COUNT },
				'backup pruning complete'
			);
		}
	} catch (err) {
		log.error({ err }, 'backup pruning failed');
	}
}

export async function runBackup(): Promise<void> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `scrolly-${timestamp}.db`;
	const backupPath = resolve(BACKUP_DIR, filename);

	try {
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		await mkdir(BACKUP_DIR, { recursive: true });

		log.info('starting database backup');
		await sqlite.backup(backupPath);

		// eslint-disable-next-line security/detect-non-literal-fs-filename
		const stats = await stat(backupPath);
		const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);
		log.info({ backupPath, sizeMb }, `backup completed (${sizeMb} MB)`);

		await pruneOldBackups();
	} catch (err) {
		log.error({ err }, 'database backup failed');
		throw err;
	}
}
