<div align="center">
  <img
    src="https://raw.githubusercontent.com/grafana/scenes/main/docusaurus/website/static/img/logo.svg"
    alt="Grafana Logo"
    width="100px"
    padding="40px"
  />
  <h1>@grafana/scenes-ml</h1>
  <p>Add Machine Learning functionality to your Scenes.</p>
</div>

## About `@grafana/scenes-ml`

This library contains a collection of `@grafana/scenes` objects which can be added to your Scenes to run interactive, responsive machine learning algorithms directly in the browser.

`@grafana/scenes-ml` currently contains implementations of the following:

- forecasting (using the MSTL/ETS algorithms)
- outlier detection (using the median absolute difference or DBSCAN algorithms)
- changepoint detection (using either Bayesian Online Changepoint Detection or Autoregressive Gaussian Process Changepoint Detection)

Under the hood, the heavy lifting is largely powered by the [`augurs`][augurs] library, which runs inside WebAssembly.
See that library for more information on the underlying algorithms.

## Usage

`@grafana/scenes-ml` is designed to be used in Grafana app plugins or Grafana core as a standard npm dependency. However, because of the WASM module in a dependency, a couple of changes are required to an app plugin's build process.

1. Install `@grafana/scenes-ml` using `yarn add @grafana/scenes-ml` or `npm install @grafana/scenes-ml` to add `scenes-ml` to your dependencies.
1. If using a plugin, ensure the create-plugin version is up to date by following [this guide][update-create-plugin-version].
   This is important to make sure your plugin's Webpack configuration knows how to load the package.
1. Import components from `@grafana/scenes-ml` and use as normal!

See the [Getting Started guide][getting-started] for more usage documentation.

[augurs]: https://github.com/grafana/augurs
[getting-started]: https://grafana.com/developers/scenes/scenes-ml/getting-started
[update-create-plugin-version]: https://grafana.com/developers/plugin-tools/migration-guides/update-create-plugin-versions
