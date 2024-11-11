import init, { initLogging } from '@bsull/augurs/core';

init().then(() => initLogging({ maxLevel: process.env.NODE_ENV === 'development' ? 'trace' : 'warn' }));

export { SceneBaseliner } from './components/SceneBaseliner';
export { SceneChangepointDetector } from './components/SceneChangepointDetector';
export { SceneOutlierDetector } from './components/SceneOutlierDetector';

// TODO: make 'testing' a named export so that it can be imported as `import { testing } from '@grafana/scenes-ml/testing';`
export * from './testing';
