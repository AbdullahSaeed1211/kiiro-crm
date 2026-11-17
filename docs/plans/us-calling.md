# US calling

**Status: implemented and locally verified in simulation; live carrier calls are unverified.** The scope is browser calling with US numbers, inbound routing, administrator number assignment, call history and private recordings. SMS, native mobile applications and customer usage billing are outside this change.

## Acceptance contract

The phone stays accessible from the application header for eligible users. The dialer survives page navigation, minimizes without hanging up, and shows a distinct hang-up action. Sales staff keep their Leads and Intake navigation. The phone does not add unrelated application access.

Owners and managers administer numbers and workspace settings. A staff member uses only assigned numbers and sees calls permitted by their own participation or inbound assignment. Linking a call to a lead requires access to that lead. Credentials, webhook payloads and recording storage keys never appear in generic collection responses.

The browser receives a credential for its own authenticated user and device. The server authorizes the destination and caller ID, reserves the call, then connects a parked browser leg to the approved telephone destination. Client-supplied metadata cannot authorize a destination, another user's device or an arbitrary caller ID. Provider configuration must prevent direct browser-to-PSTN dialing around this authorization.

The parked leg presents a short-lived signed capability issued by the authenticated CRM endpoint. It contains the reserved call, user, device credential generation, caller ID and destination. The server checks those fields against saved state and current assignment, then atomically binds the reservation to the first provider leg. A retry can resume that leg; another leg cannot reuse the reservation. The capability authorizes its holder to connect that exact reserved call. It does not attest the physical browser or SIP credential that presented it. Do not depend on undocumented credential identity fields in Telnyx webhooks, and never accept an unsigned call ID as authorization.

Signed webhook events enter a durable inbox before acknowledgement. A queue runs bounded processing with duplicate detection and recoverable leases. Delayed reconciliation handles unanswered calls and maximum duration. A duplicate event, overlapping worker or late event must not repeat a paid command or revive an ended call. Number purchases preserve a pending or uncertain result until the provider confirms the order.

Recordings stream into private R2 storage and download through an authenticated, scoped route. All persisted scheduling and call times use Unix milliseconds. Callback and appointment input displays the selected timezone, with New York as the calling default.

## Hosting and configuration

The existing tenant Worker serves the UI and API, receives Telnyx webhooks and consumes the voice queue. D1 stores settings, assignments, devices, calls, operations and the event inbox. Telnyx carries telephone and browser media. The Worker does not relay RTP audio.

The manifest schema and generator own configuration in `scripts/lib/tenant-schema.ts` and `scripts/gen-wrangler.ts`. Local development has an emulated voice queue. Live tenants add an isolated queue explicitly; calling remains disabled by default.

| Setting                          | Usage                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `voice.mode`                     | Manifest mode, `disabled` or `telnyx`; defaults to `disabled`.               |
| `voice.queue`                    | Isolated queue name; required for Telnyx mode.                               |
| `voice.connectionId`             | Telnyx credential connection used by browser devices.                        |
| `voice.callControlApplicationId` | Telnyx application used for server-controlled calls.                         |
| `TELNYX_API_KEY`                 | Worker secret for provider API calls.                                        |
| `TELNYX_PUBLIC_KEY`              | Provider verification key for webhook signatures.                            |
| `TELNYX_WEBHOOK_URL`             | Public HTTPS webhook URL for this tenant.                                    |
| `VOICE_OFFER_SECRET`             | Secret that signs short-lived number offers and call authorization metadata. |

Credentials stay outside the repository. Generate Wrangler configuration from the private manifest and install secrets through Wrangler. A deployment with missing provider setup must report calling as unavailable.

The dependency set is pinned in `apps/web/package.json`: OpenNext Cloudflare 1.20.17, Next.js 16.4.6 and Wrangler 4.164.0. Next.js uses `deprecated.looseRouteMatching` because its strict matcher incorrectly combines a modal catch-all with sibling root-layout groups. Track [Next.js issue 99830](https://github.com/vercel/next.js/issues/99830); remove the compatibility option only after login, public forms, canonical tasks and intercepted task panels pass on the replacement release. This option changes route matching, not application authorization.

## Local verification

Checked on 2026-11-18 using the development app, product API and local D1. The local simulator places no carrier calls.

- An outbound reservation survives a retry with the same request key; a second concurrent call is rejected. Simulated provider events move the call through connecting, active and ended. A different provider leg cannot reuse the capability to replace the original call legs.
- Two device answer requests racing for one inbound call produce one success and one conflict. The winning leg becomes active; hanging up a losing device leaves the accepted call active.
- Staff cannot administer numbers or settings, call from an unassigned line, act on another user's call or download its recording. Generic Payload call, device, event and leg reads are denied for staff and managers. A manager can assign a number to staff.
- D1 event leases can be completed and are not reclaimed afterward. Wrap-up updates an existing callback date instead of creating a duplicate. A callback outcome without a date is rejected.
- The dialer fits desktop and 390-pixel mobile viewports; Escape closes it and restores focus. Live microphone audio, provider number orders, recordings arriving from Telnyx and deployed queue delivery remain activation checks below.

## Activation evidence

Before enabling staff calling, record the following against the actual tenant and account:

1. Confirm the account can call the intended US destinations and receive calls from customers. Record any trial restrictions.
2. Configure the credential connection, outbound profile, parked-call behavior, Call Control application and signed webhook destination. Verify the server authorization cannot be bypassed using the browser credential.
3. Review the number's setup and recurring price before purchasing. Confirm the order and inbound assignment before presenting the number as active.
4. Verify outbound audio in both directions, then inbound ringing and first-answer behavior with two assigned staff devices.
5. Verify decline, missed-call fallback, voicemail or configured forwarding, hang-up, maximum duration and navigation during an active call.
6. Verify recording download permissions, call history privacy and callback or booking persistence in the lead's workflow.
7. Verify webhook retry and queue processing in the deployed Worker. Local simulation alone does not satisfy this check.

## Provider references

The architecture follows Telnyx's [outbound dialer](https://developers.telnyx.com/docs/voice/webrtc/use-cases/outbound-dialer), [device credentials](https://developers.telnyx.com/docs/voice/webrtc/auth/telephony-credentials) and [webhook handling](https://developers.telnyx.com/docs/development/api-fundamentals/webhooks/receiving-webhooks) documentation. Queue acknowledgement and retry behavior follows the [Cloudflare Queues API](https://developers.cloudflare.com/queues/configuration/javascript-apis/).

As documented on 2026-11-17, [Telnyx Trial accounts](https://developers.telnyx.com/docs/account-setup/levels-and-capabilities/trial) restrict calls to verified numbers. Confirm the current account level before a staff rollout.
