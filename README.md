# PayType Guard

Understand before you transact. An AI payment safety agent built on the PayPal Sandbox.

Flow: the recipient shares a readiness link; the sender opens it, describes the payment, and the agent checks it against what the recipient declared. Then: describe a payment → agent reads intent and checks consequences → you authorize → Sandbox checkout → agent reacts to payment events → appeal assistant for restrictions.

## Run it

```bash
npm install
cp .env.example .env.local      # fill in the values below
npm run dev                     # http://localhost:3000
npm test                        # core logic tests
```

### 1. PayPal Sandbox
1. Create a Sandbox app at https://developer.paypal.com/dashboard/applications/sandbox
2. Put the client ID in `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, and the secret in `PAYPAL_CLIENT_SECRET`.
   Keep credentials in the ignored `.env.local` file; never commit the client secret. Rotate credentials if they were previously exposed.
3. Use a Sandbox **personal** (buyer) account to approve the payment in the popup.
4. Webhooks (optional locally): expose the dev server (ngrok or similar), register `https://<host>/api/paypal/webhook` in the app for `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, and copy the webhook ID into `PAYPAL_WEBHOOK_ID`.
   Without a public URL, use the **Simulate** buttons on the After payment tab (`ALLOW_SIMULATION=true`). Simulated events are labelled as unverified.

### Readiness links
Set `PROFILE_SECRET` to a long random string. Recipients create a link on the *Share my readiness* tab; senders open `/pay/<token>`. Details are self-reported and signed so they can't be edited.

### 2. AI (optional)
Set `OPENAI_API_KEY`. Without it everything still works with deterministic templates. The LLM only refines intent, narrates status guidance and writes appeal drafts from user evidence; it never computes fees.

## Before you demo: verify the facts
- `src/lib/fees.ts`: sample US rate (3.49% + 0.49 USD), flagged **unverified**. Check PayPal's fee page for your market, update, set `verified: true` and `asOf`.
- `src/lib/knowledge.ts`: open each source, confirm the claim wording in `src/lib/assess.ts`, then set `lastVerified`.

## Structure
```
src/lib/        intent, fees, assess, advice, appeal, paypal, ai, store, knowledge
src/app/api/    assess, paypal/{create-order,capture-order,webhook,simulate}, events, advice, appeal
src/components/ Checker, Activity, Appeal, Trace, PayPalButtons
docs/           SRS.md, schema.sql
tests/          core.test.ts
```

## Deploying to Vercel
The in-memory event store won't share state across serverless instances. Replace `src/lib/store.ts` with Supabase (`docs/schema.sql`) before relying on webhooks in production. Set the same environment variables in Vercel.

## Safety rules the agent follows
Never claims PayPal's internal risk data; never guarantees holds; never fabricates fees or evidence; never suggests changing payment type to avoid fees or protections; never executes a payment without your authorization.
