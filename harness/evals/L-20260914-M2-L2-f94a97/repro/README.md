# L-20260914-M2-L2-f94a97 repro

`contract-drift.ts bad` models the pre-remediation CRM graph where the directory data module imports helpers and helpers import the data module. It exits nonzero when the cycle is detected.
