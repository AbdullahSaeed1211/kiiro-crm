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
7. **Email.** Outbound email sends from the workspace address set for your tenant.

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

## Send the newsletter

Settings, Newsletter.

1. Tick "Newsletter subscriber" on each contact who agreed to receive it (or use the form question above).
2. Name your lists under Audiences and tick them on contacts. Leave the lists empty to send to everyone subscribed.
3. Write the message and use "Send test" first; it goes only to you.
4. Send. A send reaches at most 500 people; larger lists go out in several rounds. Every message carries a one-click unsubscribe link, and the send is recorded on each contact's Email tab.

## Roles

| Role    | Can                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------- |
| Owner   | Everything, including Branding, Modules and Email settings, which managers cannot open             |
| Manager | Run the team: Members, Groups, Workflows, Fields, Playbooks, Sales, Newsletter, Intake and Reports |
| Staff   | Work assigned to them and their groups; no workspace settings except their own profile             |

## Routines that keep it honest

- **Daily.** Open Leads and clear the overdue markers. Every lead needs a next-action date.
- **Weekly.** Review Deals by stage and mark stale ones lost with a reason. Every lost deal keeps its reason.
- **On each won deal.** Check that the onboarding project started and assign its tasks.
- **Monthly.** Read Reports (owners and managers), prune subscribers who asked to leave, and review who still needs access under Members.

## Known limits

- The newsletter has no scheduling, pause or retry; a send is one click and one pass.
- There is no delete or archive for CRM records in the app.
- SMS, calendar sync and outgoing webhooks are not available.
