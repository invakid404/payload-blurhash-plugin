const fs = require('fs');
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

spawnSync(
  'npx',
  [
    'ncc',
    'build',
    '--source-map',
    '-o',
    'lib',
    ...externals.flatMap((dependency) => ['-e', dependency]),
    './src/index.ts',
  ],
  { stdio: 'inherit' },
);

fs.writeFileSync(
  './lib/package.json',
  JSON.stringify(
    {
      ...packageJSON,
      scripts: {},
      main: 'index.js',
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
