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
1. If using a plugin, ensure the create-plugin version is up to date by following [this guide][update-create-plugin-version]
1. Update your plugin's webpack config to enable the `asyncWebAssembly` experiment option and to load WebAssembly modules from the correct path:

   ```typescript
   // in webpack.config.ts, alongside your package.json
   import type { Configuration } from 'webpack';
   import { merge } from 'webpack-merge';
   import grafanaConfig from './.config/webpack/webpack.config';

   const config = async (env): Promise<Configuration> => {
     const baseConfig = grafanaConfig(env);
     return merge(baseConfig, {
       experiments: {
         // Required to load WASM modules.
         asyncWebAssembly: true,
       },
     });
   };

   export default config;
   ```

1. Make sure your `package.json` scripts refer to the new webpack config by following [this guide][extend-configuration]
1. Import components from `@grafana-ml/scenes-ml` and use as normal!

[augurs]: https://github.com/grafana/augurs
[update-create-plugin-version]: https://grafana.com/developers/plugin-tools/migration-guides/update-create-plugin-versions
[extend-configuration]: https://grafana.com/developers/plugin-tools/create-a-plugin/extend-a-plugin/extend-configurations#3-update-the-packagejson-to-use-the-new-webpack-config
