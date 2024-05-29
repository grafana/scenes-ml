<div align="center">
  <img
    src="https://raw.githubusercontent.com/grafana/scenes/main/docusaurus/website/static/img/logo.svg"
    alt="Grafana Logo"
    width="100px"
    padding="40px"
  />
  <h1>@grafana-ml/scenes-ml</h1>
  <p>Add Machine Learning functionality to your Scenes.</p>
</div>

## About `@grafana-ml/scenes-ml`

This library contains a collection of `@grafana/scenes` objects which can be added to your Scenes to run interactive, responsive machine learning algorithms directly in the browser.

`@grafana-ml/scenes-ml` currently contains implementations of the following:

- forecasting (using the MSTL/ETS algorithms)
- outlier detection (using the median absolute difference or DBSCAN algorithms)
- changepoint detection (using either Bayesian Online Changepoint Detection or Autoregressive Gaussian Process Changepoint Detection)

Under the hood, the heavy lifting is largely powered by the [`augurs`][augurs] library, which runs inside WebAssembly.
See that library for more information on the underlying algorithms.

## Usage

`@grafana-ml/scenes-ml` is designed to be used in Grafana app plugins or Grafana core as a standard npm dependency. However, because of the WASM module in a dependency, a couple of changes are required to an app plugin's build process.

1. Run `npm set @grafana-ml:registry=https://us-npm.pkg.dev/grafanalabs-dev/ml-npm-dev/` to tell `npm` to use a custom registry to find `scenes-ml`.
1. Run `npx google-artifactregistry-auth` and follow the instructions to authenticate with the custom npm registry.
1. Install `@grafana-ml/scenes-ml` using `yarn add @grafana-ml/scenes-ml` or `npm install @grafana-ml/scenes-ml` to add `scenes-ml` to your dependencies.
1. Update your plugin's webpack config to enable the `asyncWebAssembly` experiment option and to load WebAssembly modules from the correct path:

   ```typescript
   // in webpack.config.ts, alongside your package.json
   import type { Configuration } from 'webpack';
   import { merge } from 'webpack-merge';
   import { getPluginId } from './.config/webpack/utils';
   import grafanaConfig from './.config/webpack/webpack.config';

   const config = async (env): Promise<Configuration> => {
     const baseConfig = grafanaConfig(env);
     return merge(baseConfig, {
       experiments: {
         // Required to load WASM modules.
         asyncWebAssembly: true,
       },
       module: {
         rules: [
           // Required so that WASM modules are loaded from the correct path.
           {
             test: /\.wasm$/,
             type: 'asset/resource',
             generator: {
               publicPath: `public/plugins/${getPluginId()}/`,
             },
           },
         ],
       },
     });
   };

   export default config;
   ```

1. Import components from `@grafana-ml/scenes-ml` and use as normal!

## Development

To work on @grafana/scenes SDK, please follow the guides below.

### Setting up @grafana/scenes with a local Grafana instance

To setup scenes with local Grafana, the following setup is required:

1. Clone the [Grafana Scenes repository](https://github.com/grafana/scenes/).
1. Clone the [Grafana](https://github.com/grafana/grafana/) repository and follow the [Development guide](https://github.com/grafana/grafana/blob/main/contribute/developer-guide.md#developer-guide).
1. Setup env variable `GRAFANA_PATH` to point to your Grafana repository directory, `export GRAFANA_PATH=<path-to-grafana-directory>`
1. From Grafana Scenes root directory run `./scripts/dev.sh`. This will compile @grafana/scenes with watch mode enabled and link it to your Grafana.
1. From Grafana directory run `yarn install`.

### Setting up local version of @grafana/scenes with app plugin

1. Run `YARN_IGNORE_PATH=1 yarn link` from `packages/scenes` directory.
1. Run `yarn dev` from `packages/scenes` directory.
1. Run `yarn link @grafana/scenes` from app plugin directory.
1. Start app plugin development server.

### Demo app

Alternatively, use the [demo app](../scenes-app/README.md) included in this repository.

