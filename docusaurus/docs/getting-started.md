---
id: getting-started
title: Setup
---

This topic explains hows to install Scenes ML and use it within a Grafana App plugin.

## Installation

Use the [`@grafana/create-plugin`](https://github.com/grafana/plugin-tools/blob/main/packages/create-plugin/README.md) tool to start a completely new project.

```bash
npx @grafana/create-plugin@latest
```

Alternatively, if you're adding Scenes ML to an existing Scenes app plugin, first make sure your plugin config is up-to-date by running:

```bash
npx @grafana/create-plugin@latest --update
```

Then add `@grafana/scenes-ml` to your plugin by running the following commands in your project:

```bash
npm set @grafana:registry=https://us-npm.pkg.dev/grafanalabs-dev/ml-npm-dev/
npx google-artifactregistry-auth
yarn add @grafana/scenes-ml
```

Finally, if you're writing a plugin, update your plugin's webpack config to enable the `asyncWebAssembly` experiment option and to load WebAssembly modules from the correct path:

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

and make sure your `package.json` scripts refer to the new webpack config by following [this guide][extend-configuration].


## Add ML features to a scene

### 1. Create a scene

Create a scene using the snippet below. This will add a time series panel to the scene with built-in controls to add trend, lower and upper bounds to all series in the panel.

```ts
// helloMLScene.ts

import { EmbeddedScene, SceneFlexLayout, SceneFlexItem, SceneQueryRunner, PanelBuilders, sceneUtils } from '@grafana/scenes';
import { SceneBaseliner, MLDemoDS } from '@grafana/scenes-ml';

// Register the demo datasource from `scenes-ml`.
// This isn't required for normal usage, it just gives us some sensible demo data.
sceneUtils.registerRuntimeDataSource({ dataSource: new MLDemoDS('ml-test', 'ml-test') })

function getForecastQueryRunner() {
  return new SceneQueryRunner({
    queries: [
      { refId: 'A', datasource: { uid: 'ml-test', type: 'ml-test', }, type: 'forecasts' },
    ],
  });
}

export function getScene() {
  return new EmbeddedScene({
    body: new SceneFlexLayout({
      children: [
        new SceneFlexItem({
          width: '50%',
          height: 300,
          body: PanelBuilders.timeseries()
            .setTitle('Forecast demo')
            .setData(getForecastQueryRunner())
            // Add the `SceneBaseliner` to the panel.
            .setHeaderActions([new SceneBaseliner({ interval: 0.95 })])
            .build()
        }),
      ],
    }),
  });
}
```

### 2. Render the scene

Use the following code in your Grafana app plugin page to render the "Hello ML" scene:

```tsx
import React from 'react';
import { getScene } from './helloMLScene';

export const HelloMLPluginPage = () => {
  const scene = getScene();

  return <scene.Component model={scene} />;
};
```

## Source code

[View the example source code](https://github.com/grafana/scenes-ml/tree/main/docusaurus/docs/getting-started.tsx)

[extend-configuration]: https://grafana.com/developers/plugin-tools/create-a-plugin/extend-a-plugin/extend-configurations#3-update-the-packagejson-to-use-the-new-webpack-config
