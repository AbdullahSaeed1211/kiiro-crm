import * as migration_20260913_131654_initial from './20260913_131654_initial';

export const migrations = [
  {
    up: migration_20260913_131654_initial.up,
    down: migration_20260913_131654_initial.down,
    name: '20260913_131654_initial'
  },
];
