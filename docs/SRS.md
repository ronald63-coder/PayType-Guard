# PayType Guard: Software Requirements Specification (MVP)

Version 0.1 · Companion to PRD v1.0 and the "agentic" amendment (direction C: Payment Safety + Agentic AI).

## 1. Scope and decisions frozen

- Product: an AI payment safety agent that understands payment intent, explains consequences before money moves, runs a PayPal **Sandbox** checkout only after explicit user authorization, reacts to payment events, and helps draft appeals.
- Out of scope: live funds, PayPal's internal risk data, intercepting real personal transfers, auto-submitting appeals, predicting holds.
- Honest framing: the Orders API creates merchant checkouts. The F&F vs G&S comparison is a **policy simulation**, labelled as such in the UI.
- Agent rule: it may *recommend* and *initiate* defined actions (assess, prepare checkout, explain events, draft appeal). It may not execute a payment without the user's authorization, and it never advises changing payment type to avoid fees or protections.

## 1a. Primary user and core flow (updated)

The **sender** is the primary user. A sender cannot look up a recipient's PayPal account type or risk status (PayPal exposes no such API, and shouldn't), so readiness is **consent-based**:

1. The recipient opens *Share my readiness*, declares account type (personal / business / not sure), whether setup is complete, and an optional note.
2. The app returns a signed link `/pay/<token>`. The token holds only those declared fields and an HMAC signature, so no database is needed and senders can't alter it.
3. The recipient sends the link before being paid. The sender opens it, describes the payment, and the agent compares intent with the declared account, e.g. a commercial payment to a personal or unfinished account is flagged as a possible hold or review risk.
4. The agent lists actions before sending (ask the recipient to confirm, finish setup, or request an invoice). It never suggests switching to Friends & Family to avoid a hold.
5. The result opens with a **sender verdict**: *change type* (selected type doesn't match the real purpose; one tap re-checks with the right type), *fix first* (type is right but the recipient's side is the risk, so changing type won't help), or *send as is*. The agent tells the sender to change type only toward the type that matches the purpose; it never recommends relabelling a commercial payment as personal to avoid a hold. A hold can never be ruled out, and the UI says so.
6. If the sender proceeds, the same authorization gate and Sandbox checkout apply.

All recipient information is labelled self-reported and never presented as PayPal data.

## 2. Architecture

```
Browser (Next.js UI)
   │  /api/assess ─────────► Intent engine (rules → optional LLM) ─► Fee engine (deterministic) ─► Policy KB
   │  /api/paypal/create-order, capture-order ─► PayPal Sandbox (Orders v2)
   │  /api/events (poll) ◄── event store ◄── /api/paypal/webhook (signature verified) / simulate (demo)
   │  /api/advice ─► status playbook (deterministic) + optional LLM narrative
   └  /api/appeal ─► notice interpreter + draft (LLM, user evidence only) ─► Resolution Center link
```

Three layers (PRD §6): verified knowledge base → deterministic engine → generative AI. The LLM never computes fees or invents policy.

## 3. Screens

| Screen | Purpose | Key elements |
| --- | --- | --- |
| Check & pay | Intent, consequences, authorization, Sandbox checkout | Description box, amount, currency, type; intent card; mismatch alert; fee strip; labelled findings; sources; authorization checkbox; PayPal buttons |
| After payment | Event-driven guidance | Event list with origin chips, simulate buttons, status explainer, do/don't panel |
| Appeal a restriction | Resolution assistant | Notice paste, interpretation, evidence list, editable draft, Resolution Center link |
| Agent trace (side rail) | Show the agent's steps | Five-step trail; highlights the step waiting on the user |

## 4. API

| Endpoint | Method | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| /api/assess | POST | amount, currency, description, selectedType, optional profileToken | Assessment (+ recipient readiness) | Validated; rejects altered tokens |
| /api/profile | POST | name, accountType, setupComplete, note | `{token}` | Signed readiness link payload |
| /api/paypal/create-order | POST | same + `acknowledged: true` | `{id}` | 403 without authorization |
| /api/paypal/capture-order | POST | orderId | status, amount, currency | Records a capture-response event |
| /api/paypal/webhook | POST | PayPal event | `{received}` | Rejects if signature verification fails |
| /api/paypal/simulate | POST | orderId, eventType | `{simulated}` | Only when ALLOW_SIMULATION=true |
| /api/events | GET | ?orderId | events[] | Polled every 4 s by the UI |
| /api/advice | POST | status, amount, currency | Guidance | Deterministic playbook + optional narrative |
| /api/appeal | POST | notice, evidence, name, stage | interpretation, draft | `stage: "interpret"` returns only the reading |

## 5. Processing logic

1. **Validate**: amount in (0, 10 000], currency in USD/EUR/GBP, description 3-400 chars, type GS or FF.
2. **Intent**: keyword rules produce category + confidence. If an LLM key exists, it refines; if model and rules disagree, the result is *ambiguous* and says so.
3. **Mismatch**: commercial + FF, or personal + GS, raises an alert. The recommendation always follows the real purpose.
4. **Fees**: `fee = round2(amount × percent / 100 + fixed)`. Unconfigured currency returns `not_configured`, never a guess. Rates are flagged unverified until a human confirms them (`src/lib/fees.ts`).
5. **Findings**: each is labelled documented / estimate / assumption; documented claims link a source in `src/lib/knowledge.ts`.
6. **Authorize**: the checkbox is required before PayPal buttons render; the server rejects create-order without it.
7. **Events**: webhook (verified), capture response, or simulation → store → UI polls → `/api/advice` maps status to a playbook.
8. **Appeal**: interpret the notice, list evidence that usually helps, draft only from user-supplied evidence; gaps show as `[ADD: …]`.

## 6. Validation and safety rules

- Credentials server-side only; only the public client ID reaches the browser.
- Webhooks without a valid PayPal signature are discarded.
- No storage of passwords, card details or PayPal credentials.
- UI copy never claims knowledge of PayPal's risk score or guarantees a hold.

## 7. Test plan

| ID | Case | Expected |
| --- | --- | --- |
| T1 | $500 USD fee | 17.94 fee, 482.06 net |
| T2 | GBP fee | not_configured |
| T3 | "designing a website" | commercial |
| T4 | "sister" | personal |
| T5 | "repaying a friend" | personal, confidence < 0.7 |
| T6 | Commercial + F&F | mismatch alert, recommends G&S |
| T7 | create-order without acknowledgment | 403 |
| T8 | Webhook with bad signature | 401 |
| T9 | Pending event | Caution playbook with don'ts |
| T10 | Appeal with no evidence | Draft shows `[ADD: …]`, no invented facts |
| T11 | Commercial payment, personal recipient | Caution + invoice suggestion |
| T12 | Tampered readiness link | Rejected |

Automated: `npm test` covers T1-T6 and parts of validation. T7-T10 are manual or integration checks.

## 8. Twelve-day plan

| Days | Work |
| --- | --- |
| 1 | Sandbox app, buyer/seller test accounts, webhook registered; create/capture working |
| 2-3 | Verify every fee and policy claim; fill `lastVerified`; set real rates |
| 4-5 | Intent engine tuning with 30 sample descriptions; enable LLM refinement |
| 6-7 | Event pipeline on Supabase (schema.sql); deploy to Vercel; real webhook |
| 8 | Appeal assistant polish |
| 9 | Mobile pass, accessibility, error states |
| 10 | Test users (five) and fixes |
| 11 | Demo script, three-minute video |
| 12 | Buffer, README, submission |

## 9. Open items

- Verify fee rates for the recipient's market (rates here are samples).
- Replace in-memory store with Supabase before the deployed demo (serverless instances don't share memory).
- Optional stretch: transaction dashboard (AG Grid) after the core flow is solid.
