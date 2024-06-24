/*
 * This script generates package.json files for the dist folders of the scenes-ml packages.
 * The generated package.json files are used by the TypeScript compiler to resolve the correct types and modules.
 *
 */

const fs = require('fs-extra');
const path = require('path');

const aliasRoot = ['testing'];

aliasRoot
  .map((alias) => path.resolve(__dirname, `../${alias}`))
  .forEach((alias) => {
    if (fs.existsSync(alias)) {
      fs.removeSync(alias);
    }
    fs.ensureDirSync(alias);
  });

aliasRoot.forEach((alias) => {
  const pkgManifest = {
    name: `@grafana/scenes-ml/${alias}`,
    types: `../dist/types/${alias}/index.d.ts`,
    main: `../dist/cjs/${alias}/index.js`,
    module: `../dist/esm/${alias}/index.js`,
    sideEffects: false,
  };

  const packagePath = path.resolve(__dirname, `../${alias}/package.json`);

  console.log(`Writing: ${packagePath}`);

  fs.writeJSON(packagePath, pkgManifest, { spaces: 2 });
});
