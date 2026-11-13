# LendLoop × n8n

Three exported workflows live in [`workflows/`](workflows):

| File | Trigger | What it does |
|---|---|---|
| `01-request-notifications.json` | Webhook `POST /webhook/lendloop-events` | Verifies the HMAC, replies `202` (or `401`), emails the right person, writes the outcome back to Convex |
| `02-overdue-reminders.json` | Schedule, daily 08:00 | Fetches overdue loans from Convex (signed), emails each borrower, writes back `reminder sent` per loan per day |
| `03-error-handler.json` | Error Trigger | Reports any failed execution to Convex so it shows in **Admin → Automations** |

```
Convex mutation ──(same transaction)──▶ webhookDeliveries outbox
        │ scheduled action, signed, retried 10s/1m/5m/15m
        ▼
  [Webhook] → [Verify signature] → valid? ─no─▶ [Reject 401]
                                     │yes
                               [Accept 202] → [Compose email] → [Send email] ─ok──▶ [Report sent] ───┐
                                                                     └─error─▶ [Report failure] ─┤
                                                                                                 ▼
                                                          [Write back to LendLoop]  POST /n8n/events (signed, idempotent)
```

## Signing contract (both directions)

```
X-LendLoop-Timestamp: <unix seconds>
X-LendLoop-Signature: sha256=<hex HMAC-SHA256(secret, `${timestamp}.${rawBody}`)>
```

- **Convex → n8n** is signed with `N8N_WEBHOOK_SECRET` (n8n Variable `LENDLOOP_WEBHOOK_SECRET`).
- **n8n → Convex** is signed with `N8N_CALLBACK_SECRET` (n8n Variable `LENDLOOP_CALLBACK_SECRET`).
- The receiver recomputes the HMAC over the **raw** body, compares in constant time, and rejects
  timestamps more than 5 minutes off. Write-backs carry an `idempotencyKey` (the event id, or
  `overdue:<loanId>:<day>`), so retries and replays can't double-record.

## Setup: n8n Cloud

1. **Variables** (Overview → Variables): add
   `LENDLOOP_WEBHOOK_SECRET`, `LENDLOOP_CALLBACK_SECRET`, `LENDLOOP_CONVEX_SITE_URL`
   (the `.convex.site` URL) and optionally `LENDLOOP_FROM_EMAIL`.
   Get the secrets with `npx convex env get N8N_WEBHOOK_SECRET` / `N8N_CALLBACK_SECRET`.
2. **SMTP credential** (Credentials → Add → SMTP). For testing, a
   [Mailtrap Email Sandbox](https://mailtrap.io) inbox captures every email without delivering it.
3. **Import** the three files (Workflows → Create → ⋯ → Import from file). Import
   `03-error-handler.json` first.
4. In **01** and **02**: open each *Send* node and pick the SMTP credential, then
   Workflow settings → **Error workflow** → `LendLoop · Error handler`.
5. **Activate** 01 and 02 (the error handler doesn't need activating).
6. Copy the **Production URL** of the *LendLoop webhook* node and give it to Convex:
   ```
   npx convex env set N8N_WEBHOOK_URL https://<you>.app.n8n.cloud/webhook/lendloop-events
   ```

## Setup: self-hosted (Docker)

```
cp n8n/.env.example n8n/.env      # fill in values
docker compose up -d              # n8n :5678, Mailpit :8025
docker compose --profile tunnel up -d   # public URL so Convex Cloud can reach n8n
```

Self-hosted n8n reads the `LENDLOOP_*` values from the environment (`n8n/.env`) when
Variables aren't available. Use SMTP host `mailpit`, port `1025`, no auth, then follow steps 3–6 above.

## Trying it

- **Request notification:** request a tool in the app → the owner gets an email → the loan's
  detail panel shows *Owner notified of request*.
- **Overdue reminder:** approve a loan, then backdate it and run workflow 02 manually:
  ```
  npx convex run dev:backdateLoan '{"loanId":"<id>","daysOverdue":2}'
  ```
  Running 02 again the same day sends nothing: that loan is already marked reminded.
- **Failure path:** break the SMTP credential and request a tool → the loan shows
  *Owner notified of request: failed* with the SMTP error. Unset `N8N_WEBHOOK_URL` (or stop n8n)
  → Convex retries, then records *Couldn't reach n8n after 5 attempts*.
