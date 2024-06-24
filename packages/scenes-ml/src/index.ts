import init from '@bsull/augurs';
// eslint-disable-next-line no-console
init().then(() => console.debug('Grafana ML initialized'));

export { SceneBaseliner } from './components/SceneBaseliner';
export { SceneChangepointDetector } from './components/SceneChangepointDetector';
export { SceneOutlierDetector } from './components/SceneOutlierDetector';
