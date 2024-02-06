const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const bundledDependencies = new Set([
  // Thumbhash is an ESM module, so we need to bundle it
  'thumbhash',
]);

const packageJSON = JSON.parse(
  fs.readFileSync('package.json', { encoding: 'utf-8' }),
);

const externals = [
  ...Object.keys(packageJSON.dependencies),
  ...Object.keys(packageJSON.peerDependencies),
].filter((dependency) => !bundledDependencies.has(dependency));

require('@vercel/ncc')(path.resolve(__dirname, './src/index.ts'), {
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
  target: 'es2015', // default
  v8cache: false, // default
  quiet: false, // default
  debugLog: true // default
}).then(({ code, map, assets }) => {
  // Assets is an object of asset file names to { source, permissions, symlinks }
  // expected relative to the output code (if any)

  Object.entries(assets).forEach(([fileName, {source, permissions}]) => {
    const destFileName = path.resolve('./lib/', fileName)
    fs.mkdirSync(path.dirname(destFileName), {recursive: true})
    fs.writeFileSync(destFileName, source, {
      mode: permissions
    });
  })

  fs.writeFileSync('./lib/index.js', code);
})


fs.writeFileSync(
  './lib/package.json',
  JSON.stringify(
    {
      ...packageJSON,
      scripts: {},
      main: 'index.js',
      types: "index.d.ts",
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
    },
    null,
    2,
  ),
  'utf-8',
);
