/** Sentences the demo uses for notes, emails and tasks; `{name}` and `{company}` are filled in per record. */
export const LEAD_NOTES = [
  'Spoke for 20 minutes. {name} wants to move this quarter and asked for a rough price range.',
  'Left a voicemail and sent a follow-up email with two case studies.',
  'Budget is confirmed. Decision maker is {name}; they will loop in a second approver.',
  'Comparing us with one other agency. Our advantage: we handle hosting and ongoing support.',
  '{name} asked for references in the {company} space. Sent two.',
  'Discovery call booked for Thursday. Agenda: goals, current site problems, timeline.',
  'They are not ready before the new year. Setting a reminder to check back.',
  'Shared the proposal draft. Waiting on feedback from their partner.',
  'Needs the project live before a trade show. That sets a hard deadline.',
  'Good fit. Already uses the tools we integrate with, so onboarding should be quick.',
] as const

export const DEAL_NOTES = [
  'Proposal sent. {name} will review with the team on Monday.',
  'Asked for a smaller first phase. Reworked scope and price, sent v2.',
  'Legal is reviewing the contract. No objections on scope.',
  'Verbal yes from {name}. Waiting on the signed agreement and deposit.',
  'Pricing pushback on the retainer. Offered a 3-month trial at the lower tier.',
  'Kickoff scheduled. Brand assets and site access requested from {company}.',
  'Lost to an in-house hire. Keep warm for a later campaign.',
  'Upsell opportunity: they liked the analytics report and want monthly reporting.',
] as const

export const CONTACT_NOTES = [
  'Prefers email over phone. Best time is mid-morning.',
  'Introduced by a mutual client. Mentions us often on LinkedIn.',
  'Runs the marketing budget at {company}. Sensitive to response time.',
  'Subscribed to the newsletter after the autumn campaign.',
] as const

export const EMAIL_SUBJECTS = [
  'Following up on our call',
  'Proposal for {company}',
  'Question about timeline',
  'Re: Website project scope',
  'Next steps and kickoff date',
  'Thanks for the introduction',
] as const

export const EMAIL_BODIES = [
  'Hi {name},\n\nThanks for your time today. I have attached the summary of what we discussed and a first estimate. Let me know if anything looks off and we can adjust before the weekend.\n\nBest regards',
  'Hello {name},\n\nJust checking in on the proposal. Happy to walk through any section on a quick call. We can also start with a smaller first phase if that suits the budget better.\n\nThanks',
  'Hi {name},\n\nGreat speaking earlier. To keep things moving, could you send the logo files, brand colors and access to the current site? We will set up the project workspace in the meantime.\n\nBest',
] as const

/** Replies a prospect or client might send. */
export const EMAIL_REPLIES = [
  'Thanks, this is helpful. We will review internally and get back to you by Friday.',
  'Looks good overall. Can we move the launch two weeks later? Our team is out that week.',
  'Could you share a couple of examples from similar businesses before we decide?',
] as const

export interface TaskTemplate {
  readonly title: string
  readonly description: string
}

/** Delivery steps of a typical website project, in order. */
export const PROJECT_TASKS: readonly TaskTemplate[] = [
  { title: 'Kickoff call and goals', description: 'Confirm goals, audience, success metrics and the launch date.' },
  { title: 'Collect brand assets and access', description: 'Logos, colors, fonts, hosting and analytics access.' },
  { title: 'Sitemap and content outline', description: 'Agree pages, navigation and what content is needed.' },
  { title: 'Wireframes for key pages', description: 'Low-fidelity layouts of home, service and contact pages.' },
  { title: 'Visual design: home page', description: 'High-fidelity home page in the client brand.' },
  { title: 'Visual design: inner pages', description: 'Service, about and contact pages from the approved system.' },
  { title: 'Build templates', description: 'Responsive templates with the approved design.' },
  { title: 'Write and load content', description: 'Copy, images and metadata for every page.' },
  { title: 'Forms and integrations', description: 'Contact forms, analytics, CRM and email hooks.' },
  { title: 'QA on devices and browsers', description: 'Check phone, tablet and desktop in the main browsers.' },
  { title: 'Client review and revisions', description: 'Collect feedback and apply one round of changes.' },
  {
    title: 'Launch checklist and go-live',
    description: 'Redirects, DNS, sitemap and monitoring before switching over.',
  },
]

/** Recurring work on retainer projects. */
export const RETAINER_TASKS: readonly TaskTemplate[] = [
  { title: 'Monthly performance report', description: 'Traffic, leads and campaign results with recommendations.' },
  { title: 'Content calendar for next month', description: 'Plan posts and emails and get them approved.' },
  { title: 'Ad creative refresh', description: 'New headlines and images for the top campaigns.' },
  { title: 'Keyword and ranking check', description: 'Review ranking changes and pick pages to improve.' },
  { title: 'Publish and schedule social posts', description: 'Schedule the approved posts across channels.' },
  { title: 'Review budget pacing', description: 'Compare spend to plan and adjust bids.' },
]

export const EMAIL_TEMPLATES = [
  {
    name: 'Intro after a call',
    subject: 'Great speaking with you, {{firstName}}',
    body: 'Hi {{firstName}},\n\nThanks for the call today. As promised, here is a short summary and the next step. Reply with any questions and we will take it from there.\n\nBest regards',
  },
  {
    name: 'Proposal follow-up',
    subject: 'Checking in on the proposal',
    body: 'Hi {{firstName}},\n\nJust checking in on the proposal we sent. Happy to walk through it on a call or adjust the scope to fit your budget.\n\nThanks',
  },
  {
    name: 'Project kickoff',
    subject: 'Kicking off your project',
    body: 'Hi {{firstName}},\n\nWelcome aboard. To get started we need your logo files, brand colors and access to your current site. We will set up your project workspace today.\n\nBest',
  },
] as const
