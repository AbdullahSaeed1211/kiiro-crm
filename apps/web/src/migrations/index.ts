import * as migration_20260913_131654_initial from './20260913_131654_initial';
import * as migration_20260913_192616_m2_crm from './20260913_192616_m2_crm';
import * as migration_20260914_101142_m3_completion from './20260914_101142_m3_completion';
import * as migration_20260914_160000_brand_assets from './20260914_160000_brand_assets';
import * as migration_20260915_090000_workspace_search from './20260915_090000_workspace_search';
import * as migration_20260916_090000_email_read_state from './20260916_090000_email_read_state';
import * as migration_20260927_090000_stage_requirements from './20260927_090000_stage_requirements';
import * as migration_20260927_120000_playbooks from './20260927_120000_playbooks';
import * as migration_20260930_090000_lead_next_action from './20260930_090000_lead_next_action';
import * as migration_20260930_150000_sales_settings from './20260930_150000_sales_settings';
import * as migration_20260930_190000_intake_form_fields from './20260930_190000_intake_form_fields';
import * as migration_20261001_090000_record_archive from './20261001_090000_record_archive';
import * as migration_20261001_120000_webhooks from './20261001_120000_webhooks';
import * as migration_20261001_150000_two_factor from './20261001_150000_two_factor';
import * as migration_20261001_170000_calendar_feed from './20261001_170000_calendar_feed';
import * as migration_20261001_190000_task_repeat from './20261001_190000_task_repeat';
import * as migration_20261001_210000_api_tokens from './20261001_210000_api_tokens';
import * as migration_20261001_230000_time_entries from './20261001_230000_time_entries';
import * as migration_20261001_235000_webhook_deliveries from './20261001_235000_webhook_deliveries';
import * as migration_20261002_090000_demo_manifests from './20261002_090000_demo_manifests';
import * as migration_20261002_150000_campaign_queue from './20261002_150000_campaign_queue';
import * as migration_20261002_180000_work_archive from './20261002_180000_work_archive';
import * as migration_20261003_090000_audit_events from './20261003_090000_audit_events';
import * as migration_20261003_130000_billing_documents from './20261003_130000_billing_documents';
import * as migration_20261007_090000_task_owner_only from './20261007_090000_task_owner_only';

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
  {
    up: migration_20260927_090000_stage_requirements.up,
    down: migration_20260927_090000_stage_requirements.down,
    name: '20260927_090000_stage_requirements'
  },
  {
    up: migration_20260927_120000_playbooks.up,
    down: migration_20260927_120000_playbooks.down,
    name: '20260927_120000_playbooks'
  },
  {
    up: migration_20260930_090000_lead_next_action.up,
    down: migration_20260930_090000_lead_next_action.down,
    name: '20260930_090000_lead_next_action'
  },
  {
    up: migration_20260930_150000_sales_settings.up,
    down: migration_20260930_150000_sales_settings.down,
    name: '20260930_150000_sales_settings'
  },
  {
    up: migration_20260930_190000_intake_form_fields.up,
    down: migration_20260930_190000_intake_form_fields.down,
    name: '20260930_190000_intake_form_fields'
  },
  {
    up: migration_20261001_090000_record_archive.up,
    down: migration_20261001_090000_record_archive.down,
    name: '20261001_090000_record_archive'
  },
  {
    up: migration_20261001_120000_webhooks.up,
    down: migration_20261001_120000_webhooks.down,
    name: '20261001_120000_webhooks'
  },
  {
    up: migration_20261001_150000_two_factor.up,
    down: migration_20261001_150000_two_factor.down,
    name: '20261001_150000_two_factor'
  },
  {
    up: migration_20261001_170000_calendar_feed.up,
    down: migration_20261001_170000_calendar_feed.down,
    name: '20261001_170000_calendar_feed'
  },
  {
    up: migration_20261001_190000_task_repeat.up,
    down: migration_20261001_190000_task_repeat.down,
    name: '20261001_190000_task_repeat'
  },
  {
    up: migration_20261001_210000_api_tokens.up,
    down: migration_20261001_210000_api_tokens.down,
    name: '20261001_210000_api_tokens'
  },
  {
    up: migration_20261001_230000_time_entries.up,
    down: migration_20261001_230000_time_entries.down,
    name: '20261001_230000_time_entries'
  },
  {
    up: migration_20261001_235000_webhook_deliveries.up,
    down: migration_20261001_235000_webhook_deliveries.down,
    name: '20261001_235000_webhook_deliveries'
  },
  {
    up: migration_20261002_090000_demo_manifests.up,
    down: migration_20261002_090000_demo_manifests.down,
    name: '20261002_090000_demo_manifests'
  },
  {
    up: migration_20261002_150000_campaign_queue.up,
    down: migration_20261002_150000_campaign_queue.down,
    name: '20261002_150000_campaign_queue'
  },
  {
    up: migration_20261002_180000_work_archive.up,
    down: migration_20261002_180000_work_archive.down,
    name: '20261002_180000_work_archive'
  },
  {
    up: migration_20261003_090000_audit_events.up,
    down: migration_20261003_090000_audit_events.down,
    name: '20261003_090000_audit_events'
  },
  {
    up: migration_20261003_130000_billing_documents.up,
    down: migration_20261003_130000_billing_documents.down,
    name: '20261003_130000_billing_documents'
  },
  {
    up: migration_20261007_090000_task_owner_only.up,
    down: migration_20261007_090000_task_owner_only.down,
    name: '20261007_090000_task_owner_only'
  },
];
