import fs from 'fs/promises';
import path from 'path';
import ncc from '@vercel/ncc';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bundledDependencies = new Set([
  // Thumbhash is an ESM module, so we need to bundle it
  'thumbhash',
]);

const packageJSON = JSON.parse(
  await fs.readFile('package.json', { encoding: 'utf-8' }),
);

const externals = [
  ...Object.keys(packageJSON.dependencies),
  ...Object.keys(packageJSON.peerDependencies),
].filter((dependency) => !bundledDependencies.has(dependency));

await ncc(path.resolve(__dirname, './src/index.ts'), {
  // provide a custom cache path or disable caching
  cache: false,
  externals,
  // directory outside of which never to emit assets
  filterAssetBase: process.cwd(),
  minify: false,
  sourceMap: true,
  assetBuilds: false,
  sourceMapBasePrefix: '../', // default treats sources as output-relative
  // when outputting a sourcemap, automatically include
  // source-map-support in the output file (increases output by 32kB).
  sourceMapRegister: true, // default
  watch: false, // default
  license: '', // default does not generate a license file
  target: 'es2020', // default
  v8cache: false, // default
  quiet: false, // default
  debugLog: true, // default
}).then(async ({ code, map, assets }) => {
  // Assets is an object of asset file names to { source, permissions, symlinks }
  // expected relative to the output code (if any)

  for (const [fileName, { source, permissions }] of Object.entries(assets)) {
    const destFileName = path.resolve(__dirname, './lib/', fileName);
    await fs.mkdir(path.dirname(destFileName), { recursive: true });
    await fs.writeFile(destFileName, source, {
      mode: permissions,
    });
  }

  await fs.writeFile(path.resolve(__dirname, './lib/index.js'), code);
});

const newPackageJSON = {
  ...packageJSON,
  scripts: {},
  main: 'index.js',
  types: 'index.d.ts',
  private: false,
  files: ['**/*'],
  dependencies: externals.reduce((acc, dependency) => {
    if (!(dependency in packageJSON.dependencies)) {
      return acc;
    }

    return {
      ...acc,
      [dependency]: packageJSON.dependencies[dependency],
    };
  }, {}),
};

await fs.writeFile(
  path.resolve(__dirname, 'lib/package.json'),
  JSON.stringify(newPackageJSON, null, 2),
  'utf-8',
);

await fs.copyFile(
  path.resolve(__dirname, 'README.md'),
  path.resolve(__dirname, 'lib/README.md'),
);
