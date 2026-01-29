# MedusaJS + Green.Money Plaid Integration Plan

This document outlines a practical strategy to integrate Green.Money Plaid flows into a MedusaJS app. The approach mirrors the WooCommerce plugin behavior: a hosted Plaid iframe returns a token and institution, then the server calls Green.Money Plaid draft APIs.

## Goals
- Provide a Plaid bank login flow in Medusa checkout.
- Submit the Plaid token and order data to Green.Money to create a draft.
- Persist Green.Money response fields and surface success or error states to the user.

## Assumptions
- You have a Green.Money Client_ID and API password.
- Green.Money approves use of the `/Plaid/Woocommerce` iframe for non-WooCommerce sites.
- You have a Medusa storefront where you can add a custom checkout UI.

## Architecture Overview
Frontend:
- A button that opens a full-screen iframe pointing to:
  `https://<endpoint>/Plaid/Woocommerce?client_id=<clientId>`
- `window.postMessage` handler that receives a JSON payload with:
  `token`, `institution`, `isTAN`, `success`, `mask`, `logo?`, `helpLink?`
- On success, send payload to Medusa backend and close the iframe.

Backend:
- A Medusa payment provider or route that:
  - Validates Plaid payload
  - Maps order/customer data into Green.Money request fields
  - Calls `PlaidOneTimeDraft` (and optionally `PlaidRecurringDraft`)
  - Persists `Check_ID`, `CheckNumber`, result codes

## Implementation Steps
1) Confirm Green.Money support for the Plaid iframe in custom apps
   - Ask about domain whitelisting or additional headers
   - Request sandbox/test credentials if needed

2) Build the Plaid iframe launcher in the storefront
   - Open full-screen iframe and lock scroll
   - Validate `event.origin` before parsing `postMessage`
   - Gracefully handle cancel and retry

3) Add backend endpoints or a payment provider
   - `/plaid/authorize` or equivalent in Medusa
   - Validate payload fields and order ownership
   - Map Green.Money request fields:
     - Store, OrderID, FirstName, LastName, NameOnAccount
     - EmailAddress, Phone, Address1, Address2, City, State, Zip, Country
     - Token, InstitutionName, CheckMemo, CheckAmount, CheckDate
   - Call Green.Money `PlaidOneTimeDraft`

4) Handle responses and errors
   - Success: store `Check_ID` and `CheckNumber` on the payment
   - Result code 47: duplicate detection, present a clear error
   - Risky code: log and optionally flag for review

5) Add optional recurring support
   - Use `PlaidRecurringDraft` with subscription metadata
   - Align Medusa subscription lifecycle with Green.Money drafts

6) Add status/refund handling if required
   - Call `CheckStatus` for updates
   - Use Green.Money refund API if supported in your contract

## Testing Plan
- Sandbox credentials: success and failure cases
- Simulate malformed postMessage and invalid origin
- Duplicate payment attempt (result code 47)
- TAN flow (`isTAN`) and account verification UX

## Risks and Mitigations
- Iframe not allowed outside WooCommerce
  - Mitigation: obtain written confirmation and whitelist domains
- Spoofed postMessage payload
  - Mitigation: strict `event.origin` validation and payload schema checks
- Partial failures in Green.Money API calls
  - Mitigation: retry with idempotency keys or store pending state

## Open Questions
- Is `/Plaid/Woocommerce` officially supported for custom Medusa apps?
- Are there rate limits or required headers for Plaid draft calls?
- Are there additional APIs required for refunds or status updates?
