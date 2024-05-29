import path from 'path';
import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig from './.config/webpack/webpack.config';

const config = async (env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);
  return merge(baseConfig, {
    experiments: {
      // Required to load WASM modules.
      asyncWebAssembly: true,
    },
    // This is an attempt to get web workers to work.
    // Attempting to use Webpack's native web worker support
    // (https://webpack.js.org/guides/web-workers/)
    // results in the worker.js module being generated as an AMD module,
    // which is not supported by web workers.
    // As a workaround, we add a separate entry for our worker.ts file
    // which gives us a separate worker.js file in the dist directory.
    // We then instantiate the worker from this script (pointing directly
    // to the dist directory).
    // Note: the UMD module generated by the below entry is _still_ slightly
    // incompatible with web workers because it references `document.baseURI`
    // in one place, so we need to remove that reference before it works.
    // Diff:
    // < /******/              __webpack_require__.b = document.baseURI || self.location.href;
    // ---
    // > /******/              __webpack_require__.b = self.location.href;
    entry: {
      worker: {
        import: path.resolve(__dirname, './src/worker.ts'),
        publicPath: '/public/plugins/grafana-scenes-ml-app/',
        library: {
          name: 'worker',
          type: 'umd',
        },
      },
    },
  });
};

export default config;
