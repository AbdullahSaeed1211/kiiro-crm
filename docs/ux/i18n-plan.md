# Localization plan

Spanish is a first-class tenant locale (`en` and `es` are supported today). The workspace locale is stored in the settings global and is propagated to document language and primary navigation labels.

## Product rules

- English is the fallback for missing keys; never render a key name to a customer.
- Translation keys are grouped by surface (`shell`, `auth`, `settings`, `crm`, `work`, `inbox`) so copy stays reusable and concise.
- Tenant terminology overrides translated record nouns only; system actions and error semantics stay stable.
- Dates, times, numbers and currency use the tenant locale, configured IANA time zone and ISO currency. Relative time uses plural-aware `Intl.RelativeTimeFormat`.
- URLs, API payloads, enum values, audit verbs and permissions remain locale-neutral.

## Rollout

1. **Foundation (current):** normalize locale, set `<html lang>`, localize shell navigation and keep English fallback behavior.
2. **Core workflow:** add `es` namespaces for auth, settings, CRM, work, calendar, notifications and empty/error states; route visible strings through the message helper.
3. **Formatting:** replace hard-coded `Intl.*('en')` calls with a locale-aware formatter shared by server read models and client composites.
4. **Tenant content:** translate preset names/descriptions and provide Spanish terminology defaults; preserve custom tenant terminology verbatim.
5. **QA:** add locale snapshots for auth, shell, lists, record tabs, settings and mobile; check truncation, keyboard labels, dates, pluralization and mixed-language leakage.

The plumbing ships before every string is translated so Spanish users get a stable locale switch while untranslated areas fall back cleanly.
