import { PanelData } from "@grafana/data";

import { SceneObjectBase, SceneObjectState } from "@grafana/scenes";

export interface SceneQueryProcessor<T extends SceneObjectState> extends SceneObjectBase<T> {
  getProcessor(): (data: PanelData) => PanelData;
  // Determine whether a query and processor should be rerun.
  shouldRerun(prev: T, next: T): { processor: boolean; query: boolean; };
}

export function isQueryProcessor(obj: any): obj is SceneQueryProcessor<any> {
  return typeof obj === 'object' && 'getProcessor' in obj;
}
