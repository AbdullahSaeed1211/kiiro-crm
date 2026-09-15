import * as migration_20260913_131654_initial from './20260913_131654_initial';
import * as migration_20260913_192616_m2_crm from './20260913_192616_m2_crm';
import * as migration_20260914_101142_m3_completion from './20260914_101142_m3_completion';
import * as migration_20260914_160000_brand_assets from './20260914_160000_brand_assets';
import * as migration_20260915_090000_workspace_search from './20260915_090000_workspace_search';
import * as migration_20260916_090000_email_read_state from './20260916_090000_email_read_state';

export const migrations = [
  {
    up: migration_20260913_131654_initial.up,
    down: migration_20260913_131654_initial.down,
    name: '20260913_131654_initial',
  },
  {
    up: migration_20260913_192616_m2_crm.up,
    down: migration_20260913_192616_m2_crm.down,
    name: '20260913_192616_m2_crm',
  },
  {
    up: migration_20260914_101142_m3_completion.up,
    down: migration_20260914_101142_m3_completion.down,
    name: '20260914_101142_m3_completion'
  },
  {
    up: migration_20260914_160000_brand_assets.up,
    down: migration_20260914_160000_brand_assets.down,
    name: '20260914_160000_brand_assets'
  },
  {
    up: migration_20260915_090000_workspace_search.up,
    down: migration_20260915_090000_workspace_search.down,
    name: '20260915_090000_workspace_search'
  },
  {
    up: migration_20260916_090000_email_read_state.up,
    down: migration_20260916_090000_email_read_state.down,
    name: '20260916_090000_email_read_state'
  },
];
