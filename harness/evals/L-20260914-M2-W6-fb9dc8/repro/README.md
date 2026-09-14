# L-20260914-M2-W6-fb9dc8 repro

`records.json` models a staff directory query that returns every CRM record instead of the actor's owner or assignee scope. `access-scope.ts bad` detects the leaked record and exits nonzero.
