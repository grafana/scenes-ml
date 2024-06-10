import { SceneAppPage, SceneAppPageState } from '@grafana/scenes';
import { getMlDemo } from './ml';

export interface DemoDescriptor {
  title: string;
  getPage: (defaults: SceneAppPageState) => SceneAppPage;
}

export function getDemos(): DemoDescriptor[] {
  return [{ title: 'Scenes ML', getPage: getMlDemo }].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}
