<div align="center">
  <img
    src="https://raw.githubusercontent.com/grafana/scenes/main/docusaurus/website/static/img/logo.svg"
    alt="Grafana Logo"
    width="100px"
    padding="40px"
  />
  <h1>@grafana/scenes-ml</h1>
  <p>Add Machine Learning functionality to your Scenes.</p>
  <video
    autoPlay
    src="https://github.com/grafana/scenes-ml/assets/5464991/26440841-24c2-47f7-a1e1-e2ff97989e00"
    width="650px"
  />
</div>

## What is this?

This library contains a collection of `@grafana/scenes` objects which can be added to your Scenes to run interactive, responsive machine learning algorithms directly in the browser.

`@grafana/scenes-ml` currently contains implementations of the following:

- forecasting (using the MSTL/ETS algorithms)
- outlier detection (using the median absolute difference or DBSCAN algorithms)
- changepoint detection (using either Bayesian Online Changepoint Detection or Autoregressive Gaussian Process Changepoint Detection)

Under the hood, the heavy lifting is largely powered by the [`augurs`][augurs] library, which runs inside WebAssembly.
See that library for more information on the underlying algorithms.

## Usage

See the [library README](./packages/scenes-ml/README.md) for usage documentation.

## Development

To work on `@grafana/scenes-ml`, please follow the guides below.

### Setting up local version of `@grafana/scenes-ml` with an app plugin

1. Run `YARN_IGNORE_PATH=1 yarn link` from `packages/scenes-ml` directory.
1. Run `yarn dev` from `packages/scenes-ml` directory.
1. Run `yarn link @grafana/scenes-ml` from app plugin directory.
1. Start app plugin development server.

### Demo app

Alternatively, use the [demo app](./packages/scenes-ml-app/README.md) included in this repository.

[augurs]: https://github.com/grafana/augurs
[update-create-plugin-version]: https://grafana.com/developers/plugin-tools/migration-guides/update-create-plugin-versions
[extend-configuration]: https://grafana.com/developers/plugin-tools/create-a-plugin/extend-a-plugin/extend-configurations#3-update-the-packagejson-to-use-the-new-webpack-config
