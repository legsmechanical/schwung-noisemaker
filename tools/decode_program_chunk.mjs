#!/usr/bin/env node
/*
 * decode_program_chunk.mjs — decode the DISTRHO-Ports TAL Noisemaker
 * ProgramChunk.h `chunk[]` hex byte array into plain XML, and write it to
 * tools/factory/tal_factory_bank.xml for gen_factory_bank.mjs to consume.
 *
 * Usage: node tools/decode_program_chunk.mjs [path/to/ProgramChunk.h]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const OUT  = join(repo, 'tools/factory/tal_factory_bank.xml');

const SRC = process.argv[2] ||
  '/private/tmp/claude-501/-Users-josh-schwung-repos/4b492e9d-7697-4774-bc10-70ba8a0db187/scratchpad/distrho-nm/ports-juce5/tal-noisemaker/source/ProgramChunk.h';

const src = readFileSync(SRC, 'utf8');

const chunkStart = src.indexOf('chunk[]');
if (chunkStart === -1) throw new Error('could not find chunk[] array in ' + SRC);
const braceOpen = src.indexOf('{', chunkStart);
const braceClose = src.indexOf('}', braceOpen);
const body = src.slice(braceOpen + 1, braceClose);

const bytes = [];
const hexRe = /0x([0-9a-fA-F]{2})/g;
let m;
while ((m = hexRe.exec(body)) !== null) bytes.push(parseInt(m[1], 16));

if (bytes.length === 0) throw new Error('no hex bytes found in chunk[] array');

const xml = Buffer.from(bytes).toString('latin1');

if (!xml.trimStart().startsWith('<tal ')) {
  throw new Error(`decoded text does not start with "<tal " — got: ${xml.slice(0, 80)}`);
}

writeFileSync(OUT, xml);

const progCount = (xml.match(/<program\b/g) || []).length;
console.log(`[decode] read ${bytes.length} bytes from ${SRC}`);
console.log(`[decode] wrote ${OUT} (${xml.length} chars, ${progCount} <program> elements)`);
