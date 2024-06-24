import resolve from '@rollup/plugin-node-resolve';
import path from 'path';
import esbuild from 'rollup-plugin-esbuild';
import eslint from '@rollup/plugin-eslint';
import { externals } from 'rollup-plugin-node-externals';
import ftc from 'rollup-plugin-fork-ts-checker';
const env = process.env.NODE_ENV || 'production';
const pkg = require('./package.json');

const plugins = [
  externals({ deps: true, devDeps: true, packagePath: './package.json' }),
  resolve({ browser: true }),
  esbuild(),
  eslint(),
];

export default [
  {
    input: ['src/index.ts', 'src/testing/index.ts'],
    plugins: env === 'development' ? [ftc(), ...plugins] : plugins,
    output: [
      {
        format: 'cjs',
        sourcemap: env === 'production' ? true : 'inline',
        dir: path.dirname(pkg.main),
        preserveModules: true,
      },
      {
        format: 'esm',
        sourcemap: env === 'production' ? true : 'inline',
        dir: path.dirname(pkg.module),
        preserveModules: true,
      },
    ],
    watch: {
      include: './src/**/*',
    },
  },
];
