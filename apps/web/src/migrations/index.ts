import * as migration_20260913_131654_initial from './20260913_131654_initial';
import * as migration_20260913_192616_m2_crm from './20260913_192616_m2_crm';

export const migrations = [
  {
    up: migration_20260913_131654_initial.up,
    down: migration_20260913_131654_initial.down,
    name: '20260913_131654_initial',
  },
  {
    up: migration_20260913_192616_m2_crm.up,
    down: migration_20260913_192616_m2_crm.down,
    name: '20260913_192616_m2_crm'
  },
];
