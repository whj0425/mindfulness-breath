#!/usr/bin/env node

import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { Readable } from "node:stream";

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();
const outputDir = join(projectRoot, "styles");
const outputFile = join(outputDir, "frosted-ui.css");

const SOURCES = [
	() => require.resolve("frosted-ui/styles.css"),
	() => require.resolve("@whop/react/styles.css"),
];

async function copyIfExists() {
	for (const resolveSource of SOURCES) {
		try {
			const candidate = resolveSource();
			if (existsSync(candidate)) {
				await writeStream(createReadStream(candidate));
				console.log(`[ensure-frosted-styles] Copied stylesheet from ${candidate}`);
				return true;
			}
		} catch (error) {
			if (error.code !== "MODULE_NOT_FOUND") {
				console.warn(`[ensure-frosted-styles] Failed to resolve candidate: ${error.message}`);
			}
		}
	}
	return false;
}

async function downloadFallback() {
	const url = "https://unpkg.com/frosted-ui@0.0.1-canary.77/styles.css";
	const response = await fetch(url);
	if (!response.ok || !response.body) {
		throw new Error(`Unexpected ${response.status} while downloading ${url}`);
	}

	const nodeStream = Readable.fromWeb(response.body);
	await writeStream(nodeStream);
	console.log(`[ensure-frosted-styles] Downloaded stylesheet from ${url}`);
}

async function writeStream(source) {
	mkdirSync(outputDir, { recursive: true });
	const destination = createWriteStream(outputFile);
	await pipeline(source, destination);
}

(async () => {
	const copied = await copyIfExists();
	if (copied) return;

	try {
		await downloadFallback();
	} catch (error) {
		console.warn(`[ensure-frosted-styles] Unable to obtain frosted-ui stylesheet: ${error.message}`);
	}
})();
