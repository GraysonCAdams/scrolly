import { resolve } from 'path';
import { mkdir, unlink, chmod, stat } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import type { KnownProvider } from './types';

const DATA_DIR = resolve(process.env.DATA_DIR || 'data');

export function getProviderDir(providerId: string): string {
	return resolve(DATA_DIR, 'providers', providerId);
}

export function getBinaryPath(providerId: string, binaryName: string): string {
	return resolve(getProviderDir(providerId), binaryName);
}

export async function isBinaryInstalled(providerId: string, binaryName: string): Promise<boolean> {
	try {
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		await stat(getBinaryPath(providerId, binaryName));
		return true;
	} catch {
		return false;
	}
}

export async function downloadBinary(provider: KnownProvider, binaryName: string): Promise<string> {
	const dir = getProviderDir(provider.id);
	// eslint-disable-next-line security/detect-non-literal-fs-filename
	await mkdir(dir, { recursive: true });

	const binaryPath = resolve(dir, binaryName);

	const response = await fetch(provider.binaryUrl);
	if (!response.ok || !response.body) {
		throw new Error(`Failed to download ${provider.name}: HTTP ${response.status}`);
	}

	// eslint-disable-next-line security/detect-non-literal-fs-filename
	const fileStream = createWriteStream(binaryPath);
	await pipeline(
		Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
		fileStream
	);
	// eslint-disable-next-line security/detect-non-literal-fs-filename
	await chmod(binaryPath, 0o755);

	return binaryPath;
}

export async function removeBinary(providerId: string, binaryName: string): Promise<void> {
	try {
		// eslint-disable-next-line security/detect-non-literal-fs-filename
		await unlink(getBinaryPath(providerId, binaryName));
	} catch {
		// Already removed or never existed
	}
}
