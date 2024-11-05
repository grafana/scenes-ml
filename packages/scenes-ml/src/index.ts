import init, { initLogging } from '@bsull/augurs';
// eslint-disable-next-line no-console
init().then(() => initLogging({ maxLevel: 'warn' }));


export { SceneBaseliner } from './components/SceneBaseliner';
export { SceneChangepointDetector } from './components/SceneChangepointDetector';
export { SceneOutlierDetector } from './components/SceneOutlierDetector';

// TODO: make 'testing' a named export so that it can be imported as `import { testing } from '@grafana/scenes-ml/testing';`
export * from './testing';
