# Owner guide

For the person who owns a workspace. It covers the one-time setup, the sales configuration and the routines that keep the pipeline honest. Day-to-day use by staff is in the [staff quick start](staff-quickstart.md).

Sign in at `/login`. Owners see every Settings page; managers see most of them (see [roles](#roles)).

## Set up the workspace

Do these once, in this order. Each lives under Settings.

1. **General.** Workspace name, time zone, language, currency, the first day of the week (Monday or Sunday), and after how many days an untouched lead counts as stalled.
2. **Branding.** Logo and colours.
3. **Members and Groups.** Invite people by email and give each a role. Put people in groups such as Design or Development so work can be assigned to a team.
4. **Workflows.** Name and order the stages of the lead, deal, project and task pipelines. Each stage has a category (open, active, waiting, done, lost) that drives totals and reports.
5. **Fields.** Add your own fields to organizations, contacts, leads and deals, for example "Budget range". A field can be required before a record may enter a stage.
6. **Playbooks.** A playbook is a project with tasks and due dates. Mark one "run when a deal is won" and every won deal starts its own onboarding project.
7. **Lists.** The lead sources people pick from (website form, referral, ads...) and the reasons a lead or deal can be lost. A new workspace starts with the usual ones; add your own or remove any. A lost reason is required when marking something lost.
8. **Email.** Outbound email sends from the workspace address set for your tenant.
9. **Import.** Bring your existing organizations, contacts, leads and deals in from a spreadsheet (see below).

## Bring leads in

Settings, Intake lists your lead forms.

- **Your own website.** Each form has a public endpoint (`/api/v1/intake/<key>`). Add the exact website address under "Allowed browser origins". Turnstile protects browser submissions; a server-to-server form uses a server key instead, shown once when generated.
- **A hosted form.** Under "Form questions", add questions. The form then has a public page at `/forms/<key>` and an embed snippet for an iframe. Hosted forms need the workspace's Turnstile site key; without it the page returns 404.
- **Field mapping.** "Field mapping" says which answer fills which lead field or custom field. A question mapped to "Newsletter opt-in" makes the person a subscriber when the lead is converted.
- **Defaults.** Set the default owner, source and who is notified for each form.

Pause a form with "Accept submissions" instead of deleting it.

## Shape the sales process

Settings, Sales has three controls.

- **First-response target.** Hours a new lead may wait. Leads past it show an overdue marker in the list.
- **Assignment rules.** New leads go to the people you pick in turn, per source.
- **Email templates.** Saved messages staff can insert in the email box. Write `{{firstName}}` or `{{name}}` and the contact's name fills in.

## Import from a spreadsheet

Settings, Import takes organizations, contacts, leads and deals as CSV (up to 5 MB and 500 rows per file).

1. Download the template for what you are importing. Its columns include your own custom fields, by key.
2. Fill it in and choose the file. Press **Check file**: nothing is saved, every row is validated, and problems are listed by row number.
3. Press **Import** when the check looks right. An organization with the same name, or a contact or lead with the same email, is skipped. Contacts whose organization name is new get that organization created; leads need their organization to exist already. New leads follow your assignment rules.

A deal is skipped when a deal with the same title already exists at that organization. A deal row names its `organization` (created when new), a `value` in major units such as `12500.50`, a `currency` (your workspace currency when blank), a `stage` from the deal pipeline (the first stage when blank) and an `expectedClose` date. Projects and tasks are not imported yet.

## Text messages

When the workspace is connected to a Twilio account, contacts, leads and organizations that have a phone number show a **Text** button beside Email and Call. The message goes to the number on the record, never to one typed in elsewhere, and it is saved on the record's Email tab as "Text message". The number needs a country code, like +1 555 0100; a number without one is refused with a message saying so. A text is at most 480 characters. Twilio handles a recipient's STOP reply on its own numbers, so the person stops receiving texts from that number. Until the workspace is connected there is no Text button. An operator connects it with the three secrets in the deploy runbook.

## Send the newsletter

Settings, Newsletter.

1. Tick "Newsletter subscriber" on each contact who agreed to receive it (or use the form question above).
2. Name your lists under Audiences and tick them on contacts. Leave the lists empty to send to everyone subscribed.
3. Write the message and use "Send test" first; it goes only to you.
4. Send. A send goes to everyone chosen. The first 150 go out at once and the rest follow in rounds of 150 every 15 minutes, so a list of 3,000 finishes in about five hours. Anyone who unsubscribes while it is going out is skipped. Every message carries a one-click unsubscribe link, and the send is recorded on each contact's Email tab.

## Roles

| Role    | Can                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------- |
| Owner   | Everything, including Branding, Modules and Email settings, which managers cannot open             |
| Manager | Run the team: Members, Groups, Workflows, Fields, Playbooks, Sales, Newsletter, Intake and Reports |
| Staff   | Work assigned to them and their groups; no workspace settings except their own profile             |

## Change many deals or leads at once

On Leads and Deals, owners and managers tick several rows and choose either a new owner or an open stage, then press **Apply**. A record that someone changed meanwhile, or that cannot move to that stage, is skipped and counted. Won and lost stages are set from the record page, because they ask for a lost reason or start onboarding.

## Two-step sign-in

Anyone can turn on two-step sign-in under Settings, Profile: add the setup key to an authenticator app (1Password, Google Authenticator, Authy), enter the first 6-digit code, and save the eight recovery codes shown once. From then on, signing in asks for a code after the password; a recovery code works once in place of a code. Five wrong codes in a row lock the second step for ten minutes. Owners are encouraged to turn it on first.

A new password must be 12 to 128 characters, use at least five different characters, not be a well-known password, and not contain the name from the person's email address. Existing passwords are not re-checked, so change an old one under Settings, Profile.

If a teammate loses their phone and their recovery codes, an owner opens Settings, Members and presses **Reset two-step** on their row; they sign in with their password and can set it up again. The app does not draw a QR code yet, so the key is typed or opened as a link on a phone.

## Calendar feed

Settings, Profile, Calendar feed gives each person a private address for their calendar app. It lists the open tasks assigned to them that have a due date and the open leads they own that have a next action date, as all-day entries that link back to the record. In Google Calendar choose Other calendars, From URL; Apple Calendar and Outlook have a subscribe-by-address option too. Calendar apps refresh subscriptions on their own schedule, often every few hours. Anyone with the address can read those titles, so it is shown only when made; make a new one if it leaks (the old one stops working) or turn the feed off.

## Demo data

For a pitch or a training session, an operator can fill the workspace with a fictional dataset: about 36 clients, 100 contacts, 130 leads, 90 deals, 30 projects, 270 tasks with logged time, notes, emails and newsletters, plus demo teammates. It is added with `OPS_ALLOW_LIVE=1 pnpm seed:demo --remote <slug>`, and the records it makes are listed in the database so they can be told apart from real ones. The workspace's own owner stands in as the demo owner, settings are not changed, and the demo teammates have passwords nobody knows, so no one can sign in as them.

One owner-only call removes all of it and nothing else:

```sh
curl -X DELETE https://<workspace>/api/v1/demo -H "Authorization: Bearer <your API token>"
```

`GET /api/v1/demo` says whether demo data is present and how many records of each kind. Real records made while the demo was in place are left alone. The call works with a session cookie or a personal API token (Settings, Profile, API access).

## Remove a record

Owners and managers see an **Archive** button on each lead, deal, contact and organization page. Archiving asks for confirmation and hides the record from every list and search; its notes and history stay in the database. Settings, Archive lists everything archived and restores it with one click.

## Connect other systems

Settings, Webhooks (owners only) sends an event to another system whenever something happens to a record: a record is created, a lead or deal changes stage, a lead is converted, a note or email is added, and more. Zapier, Make, n8n and your own software can receive them.

To make requests the other way (read leads, create tasks), owners and managers make a personal API token under Settings, Profile, API access. Send it as `Authorization: Bearer <token>`; it can do exactly what its owner can, `GET /api/v1` lists every endpoint with its body, and revoking it or deactivating the person stops it at once. The token is shown once when made.

1. Add a webhook, give it a name and the public `https://` address the other system gave you, and choose the events.
2. Save, then press **Send test**. It sends a `webhook.test` event and shows what the other system answered.

Each request is a JSON `POST` with `id`, `event`, `occurredAt`, `recordType`, `recordId` and `data`. The headers `X-Webhook-Timestamp` and `X-Webhook-Signature` let the receiver check the sender: the signature is `sha256=` followed by the HMAC-SHA256 of `timestamp.body`, made with the webhook's signing secret. Receivers should reject old timestamps. A delivery that finds the other system unreachable or erroring (HTTP 5xx) is tried again after 1 and 5 seconds; a refusal such as HTTP 400 is not retried. The page lists the latest deliveries with what the other system answered and how many tries it took, for two weeks. A delivery that still fails is not queued again, so treat a webhook as a notification and read the record through the API when it matters.

## Read the pipeline

The dashboard shows owners and managers a Sales pipeline card: open pipeline value, win rate and open deals by stage. Figures goes further, and shows the time people logged on tasks in the chosen range, by person and by project (useful for retainers and billing); **Download CSV** there gives every entry (day, person, project, task, hours, note) for invoicing or payroll. Figures shows the team's work for a date range, then the whole pipeline in charts: open pipeline value, revenue won over the last six months, win rate, deals and leads by stage, and where leads come from. The charts cover every deal and lead you can see, not only the date range.

## See who changed what

Settings, Activity (owners and managers) lists the last hundred changes anyone made to records: who did it, what happened (created, edited, moved to another stage, assigned, note added, email sent, archived, restored), when, and a link to the record. The same wording appears on each organization and contact page.

## Routines that keep it honest

- **Daily.** Open Leads and clear the overdue markers. Every lead needs a next-action date.
- **Weekly.** Review Deals by stage and mark stale ones lost with a reason. Every lost deal keeps its reason.
- **On each won deal.** Check that the onboarding project started and assign its tasks.
- **Monthly.** Read Reports (owners and managers), prune subscribers who asked to leave, and review who still needs access under Members.

## Known limits

- The newsletter has no scheduling, pause or retry; a send is one click and one pass.
- Archiving hides a lead, deal, contact or organization from every list and search; Settings, Archive lists them and restores any of them.
- Text messages go one at a time from a record, not in bulk, and the app does not receive replies; the calendar feed is read-only: changes in a calendar app do not come back. Webhooks are retried twice on connection failures and server errors, and a failed one is not queued again.
