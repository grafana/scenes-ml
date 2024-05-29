import init from '@grafana-ml/augurs';
init().then(() => console.debug('Grafana ML initialized'));

export { SceneBaseliner } from './components/SceneBaseliner';
export { SceneChangepointDetector } from './components/SceneChangepointDetector';
export { SceneOutlierDetector } from './components/SceneOutlierDetector';

// export { SceneMLQueryRunner } from './querying/SceneMLQueryRunner';
