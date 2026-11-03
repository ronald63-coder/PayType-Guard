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
Generate a signing secret and add it as `PROFILE_SECRET` in `.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Restart the app after changing `.env.local`. Senders can start on *Ask for readiness* to create a signed `/ask/<token>` link with an optional amount and purpose. The recipient answers the readiness questions and sends back a signed `/pay/<token>` link with those payment details prefilled. Click the generated links to open them, or copy and send them. Details are self-reported; signed profile data can't be edited without invalidating the link.

### 2. AI (optional)
Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY` in `.env.local`. The app uses `gemini-2.5-flash` by default; override it with `GEMINI_MODEL` if needed. Without a key, everything still works with deterministic templates. Gemini only refines intent, narrates status guidance and writes appeal drafts from user evidence; it never computes fees.

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

## Deploying to Render
The in-memory event store won't share state across serverless instances. Replace `src/lib/store.ts` with Supabase (`docs/schema.sql`) before relying on webhooks in production. Set the same environment variables in Render.

## Safety rules the agent follows
Never claims PayPal's internal risk data; never guarantees holds; never fabricates fees or evidence; never suggests changing payment type to avoid fees or protections; never executes a payment without your authorization.
