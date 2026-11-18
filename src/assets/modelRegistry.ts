import { withBase } from './baseUrl';

export const MODEL_PATHS = {
  candyCaneGreen: withBase('/models/kenney/candy-cane-green.glb'),
  candyCaneRed: withBase('/models/kenney/candy-cane-red.glb'),
  gingerbreadMan: withBase('/models/kenney/gingerbread-man.glb'),
  nutcracker: withBase('/models/kenney/nutcracker.glb'),
  trainLocomotive: withBase('/models/kenney/train-locomotive.glb'),
  trainTender: withBase('/models/kenney/train-tender.glb'),
  trainWagonLogs: withBase('/models/kenney/train-wagon-logs.glb'),
  trainWagon: withBase('/models/kenney/train-wagon.glb'),
  wreathDecorated: withBase('/models/kenney/wreath-decorated.glb'),
  stagRigged: withBase('/models/quaternius/Stag.glb'),
} as const;

export type ModelKey = keyof typeof MODEL_PATHS;
