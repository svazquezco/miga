import { readdir, readFile, writeFile } from 'node:fs/promises';

const assets = (await readdir('dist/assets')).sort().map((name) => './assets/' + name);
const path = 'dist/sw.js';
const worker = await readFile(path, 'utf8');
await writeFile(
  path,
  worker.replace(
    'const BUILD_ASSETS = [];',
    'const BUILD_ASSETS = ' + JSON.stringify(assets) + ';',
  ),
);
