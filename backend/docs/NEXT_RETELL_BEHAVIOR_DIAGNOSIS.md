# Next Retell Behavior Diagnosis

Date: 2026-09-15

This diagnosis is based on the current source tree. No application code or Retell prompt was modified.

## Scope and confidence

The source code proves how PEOPLIX constructs and returns context. It cannot prove the deployed environment variables, the live Retell agent prompt/version, the live phone-number binding, or the exact payload Retell received during a real call. Those items require deployment logs, Retell request logs, or a controlled test call.

## A. Definitely working

- `POST /api/retell/inbound-call` is registered under `/api/retell/inbound-call` and protected by the Retell signature middleware.
- The inbound handler reads `call_inbound.to_number`, with `destination_number` as a fallback.
- Tenant resolution for the inbound response is based on an active `PHONE_ASSIGNMENTS` record matching the called number. It does not use the Retell agent ID for this response.
- After the assignment is found, the handler calls `buildCompanyCallContext(assignment.company_id, { phoneAssignmentId, phoneNumber })`.
- The returned response shape is:

  ```json
  {
    "call_inbound": {
      "override_agent_id": "...",
      "dynamic_variables": { "...": "..." },
      "welcome_message": "...",
      "metadata": { "company_id": "...", "phone_assignment_id": "...", "phone_number": "...", "agent_id": "..." }
    }
  }
  ```

- The canonical company record supplies `company_name`; `company_description`, email, phone, website, and address are assembled from the company record with limited fallbacks.
- `company_knowledge`, `phone_number_knowledge`, and `phone_number_pdf_knowledge` are assigned as strings in the normal current path. PDF knowledge is sliced to 100,000 characters before being put into its dedicated variable.
- The inbound handler sends `override_agent_id` from the same resolved context used to build the variables.
- Function endpoints resolve the company from `call_id` through the call log, then fall back to Retell's call record and its destination phone number. They do not trust a company ID supplied in a function request.
- Employee, department, FAQ, policy, and document queries are company-scoped in their repository/database filters.
- The JSON parser preserves the raw request body before parsing, and the webhook signature is checked against that raw body when available.
- The frontend company profile save endpoint sends company fields and `knowledge_center` to the authenticated company endpoint. The backend persists the company record before starting asynchronous knowledge analysis.

## B. Definitely broken or incomplete

### 1. The context is not validated as a string-only Retell payload

`RetellDynamicVariables` is typed as string values, but the runtime object begins with:

```ts
...(cfg?.dynamic_variables || {})
```

There is no runtime normalization or validation after this spread. Older or manually inserted MongoDB values can therefore remain `null`, numbers, objects, arrays, or other malformed values. The AI-config write schema only protects new API writes; it does not repair existing database data.

The same general issue applies to legacy profile documents, although most profile fields use `|| ''` when assembled.

### 2. `company_knowledge` is a large mixed aggregate, not a narrow canonical company fact set

`buildCompanyCallContext()` combines:

- all saved company knowledge sections,
- up to 50 active policies,
- up to 100 active FAQs,
- up to 25 active documents,
- up to 250 active employees,
- up to 100 active departments,
- phone profile description and knowledge,
- phone PDF text,
- phone additional instructions.

The combined value is then truncated with `.slice(0, 100000)`. This can cut text at an arbitrary character boundary and can remove later sections entirely. It also places phone-specific information inside `company_knowledge` while sending the same phone information again in dedicated variables. That creates duplicate and potentially conflicting instructions for the LLM.

### 3. Company knowledge and phone knowledge can conflict

The prompt receives both the aggregate `company_knowledge` and the separate `phone_number_knowledge` / `phone_number_pdf_knowledge`. The backend does not define precedence between them, does not detect contradictory values, and does not label every value with a reliable source and authority level. A stale phone profile can therefore disagree with the current company record.

### 4. The inbound response does not send `ai_instructions` as a Retell instruction override

`buildCompanyCallContext()` computes `ai_instructions`, but `/inbound-call` returns only `override_agent_id`, `dynamic_variables`, `welcome_message`, and `metadata`. The computed `ai_instructions` is included only as a dynamic variable named `ai_instructions`; this has no effect unless the live Retell prompt explicitly references `{{ai_instructions}}`.

The same applies to `retell_llm_id`: it is resolved but is not included in the inbound response.

### 5. Agent fallback is permissive and can silently select the wrong configured agent

The selected agent is:

```ts
profile?.retell_agent_id || cfg?.retell_agent_id || config.retell.agentId || ''
```

No inbound-time verification confirms that the selected agent exists, is active, is intended for this phone assignment, or matches the agent actually bound to the Retell phone number. A stale profile value or stale company AI-config value can override the environment agent.

### 6. One Retell agent can be linked to multiple companies

The `retell_agents` collection has a unique index on `(company_id, retell_agent_id)` and a non-unique index on `retell_agent_id`. The routes explicitly document that one agent may serve multiple companies. This is valid only if every call always receives correct dynamic variables and the shared Retell prompt never contains company-specific static text. The design provides no protection against stale agent-level prompt content or an incorrect inbound override.

### 7. Agent-based tenant resolution exists but is not the tenant authority

`resolveCompanyFromAgent()` exists and caches one company for an agent, but it is not called by the current inbound or function-call paths. If another code path or future change uses it, it is unsafe for a shared agent because one agent can map to multiple companies. The current code should make that invariant explicit by removing or prohibiting agent-only resolution for tenant context.

### 8. Function-call race fallback depends on Retell's call record being immediately available

If a function call arrives before `call_started` is persisted, `resolveCompanyFromCall()` calls Retell `getCall(call_id)` and resolves the destination number. If that API call is delayed, unavailable, or lacks `to_number`, the function returns an empty/not-found answer. This explains some "I do not know" responses, but it does not by itself explain a wrong company in the initial greeting.

### 9. Cache behavior is incomplete for runtime knowledge freshness

AI-config writes invalidate the AI-config cache. Company profile/knowledge writes invalidate tenant cache and trigger analysis, but `CompaniesService.update()` does not invalidate the AI-config repository cache. `buildCompanyCallContext()` reads the company record directly, so company fields are likely current, but stale cached AI-config dynamic variables and fallback values can remain available for up to 30 minutes. Profile writes do not invalidate an AI-config cache either; the profile is read directly, so this is less likely to affect profile text but still leaves inconsistent cache semantics.

### 10. The existing integration documentation is stale

`backend/docs/RETELL_INTEGRATION.md` describes an older flow and SQL-style examples, including agent-based tenant lookup. It does not document the current `/inbound-call` response contract, phone-assignment authority, or current dynamic variable construction. This increases deployment and troubleshooting risk, although documentation itself is not the runtime cause.

## C. Most likely root cause of wrong or empty company information

The most likely root cause is not failure to attach the variables. It is an unreliable context contract at the Retell boundary, caused by the combination of:

1. a shared Retell agent,
2. a very large aggregate `company_knowledge` value that duplicates phone knowledge and can be truncated,
3. no runtime string-only validation or empty-value policy,
4. permissive agent fallback from potentially stale profile/config data, and
5. no source precedence rule when company and phone profile text disagree.

For empty answers, the secondary likely cause is that the live Retell prompt does not actually instruct Ava how to use these variables, or the live prompt/agent version differs from the prompt described by the request. The source tree contains no Retell prompt text, so that cannot be verified locally.

A separate possible production cause is that the live phone number is still bound to a different agent or a different inbound webhook URL than the current deployment. The code cannot establish that from source.

## D. Strange-language behavior

The backend source contains no language, locale, or voice selection setting. It only types `voice_id` in the response returned by `getAgent()`; it does not change voice or language at call time.

Therefore, unexpected-language behavior is more likely caused by the live Retell agent's language/voice/model settings, multilingual auto-detection, the live prompt, or caller/transcription behavior than by the current backend. The backend could contribute indirectly if malformed or conflicting knowledge contains non-target-language text, or if an unexpected/stale agent is selected. The next fix should inspect and verify the live Retell agent configuration rather than claim the backend is the direct language cause.

## E. Required change categories

- **Backend changes:** Yes. Normalize and validate every inbound dynamic variable as a non-null string, reject or log invalid context, make agent selection and phone binding deterministic, define precedence between company and phone data, keep the aggregate context bounded by section, and make call/function tenant resolution use one authoritative call context.
- **Retell prompt changes:** Only if inspection proves the live prompt does not define precedence, language, and variable usage. Preserve the existing prompt otherwise.
- **Retell agent configuration changes:** Likely yes. Verify the exact agent selected by the inbound response and the phone-number binding, then verify language, voice, model, multilingual settings, and any static company-specific prompt text.
- **Deployment changes:** Possibly. Verify that the deployed backend has the intended `RETELL_API_KEY`, `RETELL_AGENT_ID`, `RETELL_INBOUND_WEBHOOK_URL`, database, cache provider, and webhook URL, and that Retell is calling that deployment. Do not change deployment configuration without comparing live values and logs.

## F. Exact next implementation prompt

```text
Fix the current PEOPLIX inbound Retell behavior based on the verified findings in backend/docs/NEXT_RETELL_BEHAVIOR_DIAGNOSIS.md.

Before editing, inspect the current files again and confirm the diagnosis against the current code. Do not modify the Retell prompt unless you prove from the current runtime contract that a prompt change is required.

Implement only the minimum backend changes required to make inbound Retell context deterministic and reliable:

1. Keep PHONE_ASSIGNMENTS, the called phone number, and the existing tenant-isolation rules as the authoritative inbound tenant source. Never resolve an inbound tenant from agent_id alone.
2. Ensure the inbound `/api/retell/inbound-call` response attaches dynamic variables to the `call_inbound` response that contains the matching `override_agent_id`.
3. Before returning the response, normalize every dynamic variable to a finite, non-null string. Remove or safely replace undefined, null, object, array, malformed, and non-string values. Preserve custom string variables where they are valid.
4. Make the selected inbound agent deterministic and verifiable. Use the phone assignment/profile agent only when it is valid for that assignment; otherwise use the configured company/global agent. Do not silently allow a stale or invalid profile/config value to override the intended agent. Do not reintroduce agent-only tenant resolution.
5. Preserve support for one shared Retell agent across multiple companies. Company-specific context must come only from the resolved phone assignment/company and current database records.
6. Reduce ambiguity in the runtime context without deleting existing functionality: keep the existing named variables, but prevent duplicate/conflicting phone information from being mixed into the wrong variable. Define and enforce a clear precedence: canonical company fields for company identity, phone profile fields for number-specific information, and explicit fallback text when information is unavailable.
7. Prevent arbitrary mid-content truncation where practical. Keep Retell payload values within the existing limits, retain the most important identity/contact fields, and log the lengths and validity of the returned variables without logging sensitive full knowledge contents.
8. Make function requests use the same authoritative call context consistently after the call starts. Preserve the current call-log lookup and race-safe phone fallback, but ensure the stored call context includes the resolved company and phone assignment whenever possible. Never accept company context from user-supplied function parameters.
9. Review cache invalidation for company profile/knowledge, AI config, and phone profile updates so a newly saved value cannot remain stale in the inbound call context. Change only the relevant cache invalidation paths.
10. Add focused tests or a small testable validation path covering: two companies sharing one Retell agent; correct phone-to-company resolution; string-only variables; null/undefined/malformed stored values; empty company fields; conflicting company versus phone knowledge; truncated/oversized knowledge; early function calls before call_started; and incorrect/missing phone assignment.

Also inspect the live-agent assumptions in code and report, without guessing, which Retell-console/deployment checks remain manual: phone binding, selected agent, language/voice/model settings, static prompt content, webhook URL, deployed environment variables, and deployed commit.

Do not delete existing functionality. Do not rewrite the architecture. Do not modify unrelated sections. Preserve tenant isolation, the current Twilio/Retell integration, acknowledgement and interruption behavior, web-call behavior, function endpoints, and the existing Retell prompt unless a specific prompt defect is proven. Run the backend build and the focused tests after editing, and report the exact files changed and any remaining manual verification steps.
```

## Manual verification required before trusting a production call

- Capture one real `/api/retell/inbound-call` request and response, with sensitive knowledge contents redacted but variable names, types, lengths, company ID, phone assignment ID, and agent ID retained.
- Confirm the returned `override_agent_id` equals the agent actually used by the Retell call.
- Confirm the called number maps to exactly one active assignment in the production database.
- Confirm the deployed backend commit matches this source tree and the production environment values point to the intended database and webhook URL.
- Inspect the live Retell agent's prompt, language, voice, model, multilingual behavior, and phone-number binding.
- Use two test companies sharing the same agent and call both numbers, verifying the greeting and a company-info question independently.
