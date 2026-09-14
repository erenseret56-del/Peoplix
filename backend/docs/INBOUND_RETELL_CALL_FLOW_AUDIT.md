# PEOPLIX Inbound Retell Call Flow Audit

**Date:** 2026-09-15  
**Scope:** Inbound Retell flow audit and backend dynamic-variable implementation record.

## Executive Summary

The inbound call flow resolves the company primarily from the called phone number, not from the Retell agent ID:

```text
Retell/Twilio inbound call
        |
        | call_inbound.to_number
        v
POST /api/retell/inbound-call
        |
        v
PHONE_ASSIGNMENTS lookup
        |
        | phone_assignments.company_id
        v
companies lookup
        |
        v
AIConfigService.buildCompanyCallContext()
        |
        v
Retell inbound response
        |
        | override_agent_id
        | dynamic_variables
        | welcome_message
        | metadata
        v
Retell agent / LLM prompt
        |
        v
Ava response
```

The backend constructs company-specific context and now exposes both aggregate and phone-specific knowledge variables. The source code still reveals important operational limitations:

1. The initial inbound context contains the aggregate `company_knowledge` variable and now also exposes separate phone knowledge variables.
2. `phone_number_knowledge` comes from the scoped phone profile's `knowledge_text`.
3. `phone_number_pdf_knowledge` comes from the scoped phone profile's `knowledge_file_text`, bounded to 100,000 characters.
4. The actual Retell dashboard prompt is external to this repository, so the source code cannot prove that the Retell agent references the dynamic variables.
5. Retell agent IDs can be shared by multiple companies and cannot be used as the tenant identity.

## Implementation Completed

The backend now adds these explicit variables to the canonical Retell context:

```text
phone_number_knowledge
phone_number_pdf_knowledge
```

The existing aggregate variable remains intact:

```text
company_knowledge
```

The new variables are returned through the existing inbound response path. No Retell prompt, unrelated route, acknowledgement flow, interruption handling, or tool behavior was modified.

## 1. Inbound Company Resolution

The inbound route is implemented in:

- [`backend/src/modules/retell/retell.routes.ts`](../src/modules/retell/retell.routes.ts)
- [`backend/src/modules/retell/retell.service.ts`](../src/modules/retell/retell.service.ts)

The route reads the destination number from the Retell inbound payload:

```ts
const destinationNumber =
  inbound.to_number || inbound.destination_number;
```

It then calls:

```ts
const assignment =
  await retellService.resolvePhoneAssignmentForNumber(destinationNumber);
```

The resolver normalizes the phone number to digits and searches active records in `PHONE_ASSIGNMENTS` using:

- `normalized_phone_number`
- `phone_number`
- `status: 'assigned'`

The company is identified by:

```ts
assignment.company_id
```

That company ID is passed into:

```ts
aiConfigService.buildCompanyCallContext(
  assignment.company_id,
  {
    phoneAssignmentId: assignment.phone_assignment_id,
    phoneNumber: assignment.phone_number || destinationNumber,
  },
);
```

The inbound route does not use the Retell agent ID as its primary tenant resolver.

## 2. Company Name Source

The company record is loaded by:

- [`backend/src/modules/companies/companies.repository.ts`](../src/modules/companies/companies.repository.ts)
- [`backend/src/modules/companies/companies.service.ts`](../src/modules/companies/companies.service.ts)
- [`backend/src/modules/ai-config/ai-config.service.ts`](../src/modules/ai-config/ai-config.service.ts)

The repository queries MongoDB using the company ID:

```ts
{
  _id: new ObjectId(id),
  deleted_at: null,
}
```

The dynamic variable is created from the canonical company record:

```ts
company_name: company.name
```

Therefore the runtime value is:

```text
companies.name
```

There is no Primeflex-specific value in this client inbound path. The current literal database value cannot be confirmed without a live MongoDB connection.

## 3. Phone Number to Company Relationship

The collection names are defined in:

- [`backend/src/infrastructure/database/index.ts`](../src/infrastructure/database/index.ts)

The relationship is stored in `phone_assignments`:

```text
phone_assignments._id
phone_assignments.phone_number
phone_assignments.normalized_phone_number
phone_assignments.company_id
phone_assignments.status
phone_assignments.twilio_sid
```

The relationship is:

```text
phone_assignments.phone_number
        |
        v
phone_assignments.company_id
        |
        v
companies._id
```

Phone-specific knowledge is stored separately in `number_profiles`:

```text
number_profiles.company_id
number_profiles.phone_assignment_id
number_profiles.display_name
number_profiles.description
number_profiles.knowledge_text
number_profiles.knowledge_file_text
number_profiles.retell_agent_id
```

The phone assignment indexes include:

```ts
{ key: { company_id: 1, normalized_phone_number: 1 }, unique: true }
{ key: { normalized_phone_number: 1 }, unique: true }
```

The second index is intended to prevent one physical phone number from being assigned to multiple companies.

## 4. Dynamic Variables Constructed Before Retell

The canonical builder is:

- [`backend/src/modules/ai-config/ai-config.service.ts`](../src/modules/ai-config/ai-config.service.ts)

The dynamic variable object contains the following known values:

```text
company_name
company_description
company_email
company_phone
company_website
company_address
company_knowledge
phone_number_knowledge
phone_number_pdf_knowledge
number_display_name
number_description
additional_instructions
ai_instructions
receptionist_name
greeting_name
business_hours_text (when business hours are configured)
```

Additional custom variables may also come from `cfg.dynamic_variables`.

The main values are constructed from:

```ts
company_name: company.name
company_description: company.description
company_email: company.email
company_phone: assignment.phone_number || options.phoneNumber || company.phone
company_website: company.website
company_address: buildAddress(company)
company_knowledge: knowledgeContext
```

The aggregate `company_knowledge` contains, where available:

- Company name and description
- Company knowledge-center content
- HR policies
- FAQs
- Important company information
- Employee-related information
- Departments
- Working hours
- Leave information
- Company documents
- Phone profile description
- Phone profile `knowledge_text`
- Phone profile additional instructions

The aggregate context is capped at 100,000 characters.

## 5. Are Variables Attached to the Inbound Call?

Yes. The inbound route returns:

```ts
return reply.send({
  call_inbound: {
    override_agent_id: resolvedConfig.retell_agent_id,
    dynamic_variables: resolvedConfig.dynamic_variables,
    welcome_message: resolvedConfig.welcome_message,
    metadata: resolvedConfig.metadata,
  },
});
```

Therefore the backend attaches values through:

```text
call_inbound.dynamic_variables
```

The selected agent is returned through:

```text
call_inbound.override_agent_id
```

The web-call flow is separate. It uses:

```ts
retell_llm_dynamic_variables
```

in:

- [`backend/src/modules/retell/retell.client.ts`](../src/modules/retell/retell.client.ts)

## 6. Retell Variable Availability

### `company_name`

**Backend availability:** Yes.

The backend sends:

```ts
company_name: company.name
```

**Agent usage:** Cannot be proven from this repository.

The external Retell prompt must reference:

```text
{{company_name}}
```

### `company_knowledge`

**Backend availability:** Yes.

The backend sends the curated aggregate context as:

```text
company_knowledge
```

**Agent usage:** Cannot be proven from this repository.

The external Retell prompt must reference:

```text
{{company_knowledge}}
```

### `phone_number_knowledge`

**Backend availability:** Yes.

The backend creates this variable from the phone profile loaded with both:

```text
number_profiles.company_id
number_profiles.phone_assignment_id
```

Its source field is:

```text
number_profiles.knowledge_text
```

The value is also preserved inside the aggregate `company_knowledge` context.

### `phone_number_pdf_knowledge`

**Backend availability:** Yes.

The backend stores PDF text as:

```text
number_profiles.knowledge_file_text
```

That field is now included in the initial inbound dynamic variables as `phone_number_pdf_knowledge` and is also included in the aggregate `company_knowledge` context. The value is capped at 100,000 characters before being sent to Retell.

## 7. Company Name Fallbacks and Identity Sources

For the real client inbound call path, `company_name` comes directly from:

```ts
company.name
```

There is no fallback company name in `buildCompanyCallContext()`.

Other identity-related values found elsewhere are separate flows or display fallbacks:

- Public demo flow uses a hardcoded public-demo company name `Peoplix`.
- Admin listing code may display `Unknown company` when an associated record is absent.
- Phone profile `display_name` is sent as `number_display_name`; it does not replace `company_name`.
- The default welcome template uses the placeholder `{{company_name}}`.

The public-demo `Peoplix` value must not be confused with the authenticated client inbound flow.

## 8. Retell Agent Sharing

The code allows the same Retell agent to be linked to multiple companies.

The Retell agent mapping is implemented in:

- [`backend/src/modules/retell/retell-agents.routes.ts`](../src/modules/retell/retell-agents.routes.ts)

The database index is unique on the pair:

```ts
{
  company_id: 1,
  retell_agent_id: 1,
}
```

There is also a non-unique index on:

```text
retell_agent_id
```

Therefore this is allowed:

```text
Company A + Agent X
Company B + Agent X
```

The code explicitly documents that one Retell agent may serve multiple companies using dynamic variables.

The method `resolveCompanyFromAgent()` uses a single `findOne()` by agent ID. If multiple companies share that agent, this method would be ambiguous. It is not the primary inbound tenant resolver, but it must not be used as the authorization source.

## 9. Is the Phone Number Sufficiently Unique?

The intended design is yes:

```text
one assigned phone number → one company
```

This is supported by the global unique index on `normalized_phone_number`.

Potential ambiguity remains for legacy or malformed records:

- Older records may use inconsistent formatting.
- `phone_number` and `normalized_phone_number` can differ.
- The resolver uses `findOne()`.
- If duplicate legacy records bypassed the intended index, the first result would win.

The current resolver also includes a fallback for Retell function calls that occur before the call-started webhook has been saved:

```text
call log lookup
→ Retell call lookup
→ Retell call destination number
→ phone assignment
→ company_id
```

This fallback still uses the phone number, not the agent ID.

## 10. Exact Context Sent When an Inbound Call Begins

The backend-generated context starts with:

```text
Use only the saved company and phone information below to answer questions.
If the answer is not present, say that the information is not available.
```

The context then contains sections equivalent to:

```text
Company: <companies.name>

<companies.description>

Company knowledge: <knowledge_center.company_knowledge>

HR policies:
<knowledge_center.hr_policies>
<active policy records>

FAQs:
<knowledge_center.faqs>
<active FAQ records>

Important information:
<knowledge_center.important_information>

Employee information:
<knowledge_center.employee_information>
Employees: <bounded employee names and numbers>

Departments:
<active department records>

Working hours:
<knowledge_center.working_hours>

Leave information:
<knowledge_center.leave_information>

Company documents:
<bounded active document content>

Phone number:
<number_profiles.display_name>

<number_profiles.description>

<number_profiles.knowledge_text>

Additional instructions:
<number_profiles.additional_instructions>
```

This entire text becomes:

```text
company_knowledge
```

The inbound response also contains:

```text
company_name
company_description
company_email
company_phone
company_website
company_address
company_knowledge
number_display_name
number_description
additional_instructions
ai_instructions
receptionist_name
greeting_name
business_hours_text (when configured)
```

### Explicit phone variables now included

The following are separate initial inbound variables:

```text
phone_number_knowledge
phone_number_pdf_knowledge
```

Both are returned through `call_inbound.dynamic_variables`. PDF knowledge is also appended to the initial `company_knowledge` context.

The implementation is in:

- [`backend/src/modules/ai-config/ai-config.types.ts`](../src/modules/ai-config/ai-config.types.ts)
- [`backend/src/modules/ai-config/ai-config.service.ts`](../src/modules/ai-config/ai-config.service.ts)
- [`backend/src/modules/retell/retell.routes.ts`](../src/modules/retell/retell.routes.ts)

The context builder creates bounded values:

```ts
const phoneNumberKnowledge = profile?.knowledge_text || '';
const phoneNumberPdfKnowledge =
        (profile?.knowledge_file_text || '').slice(0, 100000);
```

Then it returns:

```ts
phone_number_knowledge: phoneNumberKnowledge,
phone_number_pdf_knowledge: phoneNumberPdfKnowledge,
```

The inbound route passes the complete dynamic-variable object unchanged:

```ts
dynamic_variables: resolvedConfig.dynamic_variables
```

### External prompt limitation

The actual static Retell prompt is not stored in this repository. The source code therefore proves that the backend returns the dynamic variables, but it cannot prove that the Retell dashboard prompt references them.

## Data-Flow Findings

### What is working in source code

- Authenticated dashboard requests resolve the company from JWT/session tenant context.
- Inbound calls resolve the company from the called phone number.
- `company_name` is loaded from `companies.name`.
- Policies, FAQs, documents, departments, employees, and company knowledge are queried with the resolved company ID.
- Dynamic variables are returned in the inbound Retell response.
- Tool lookups resolve the tenant from the call log or, as a race-safe fallback, the call destination number.

### What is incomplete or ambiguous

- The external Retell prompt is not available for inspection.
- Phone PDF text is now included in the initial inbound context and in the explicit PDF variable.
- Separate phone knowledge variable names are now present.
- Agent IDs can be shared across companies.
- Agent-only company resolution is ambiguous and unsafe as a tenant authority.
- Legacy duplicate or malformed phone-assignment records could create ambiguity.

## ROOT CAUSE

The main inbound route does not discard the company ID when the phone assignment is valid. The main integration weaknesses are:

1. The backend sends both aggregate company context and separate phone knowledge variables. The actual Retell prompt is external, so the repository cannot verify that Ava uses them.
2. Retell agent IDs are reusable and cannot uniquely identify a company.

## WHAT SHOULD BE FIXED

1. Ensure the Retell prompt explicitly references:

   ```text
   {{company_name}}
   {{company_description}}
   {{company_email}}
   {{company_phone}}
   {{company_address}}
   {{company_knowledge}}
   {{phone_number_knowledge}}
   {{phone_number_pdf_knowledge}}
   ```

2. Configure the prompt to use only supplied context and say information is unavailable when missing.

3. Keep phone assignment as the authoritative inbound tenant resolver.

4. Do not use agent ID as tenant authorization.

5. Validate and repair legacy duplicate phone assignments.

6. Add integration tests for two companies and two assigned phone numbers.

7. Add an inbound-response test proving PDF knowledge is present when configured.

8. Verify the actual Retell dashboard prompt and agent configuration directly.

## Safe Structured Logging

The inbound route logs only operational metadata:

```text
callId
destinationNumber
companyId
companyName
phoneAssignmentId
companyKnowledgeFound
phoneNumberKnowledgeFound
phoneNumberPdfKnowledgeFound
```

The implementation does not log:

- API keys
- Retell secrets
- JWT secrets
- Webhook signatures
- Full employee records
- Full transcripts
- Sensitive HR content

## Validation Results

The following checks passed after implementation:

```text
backend: pnpm build
```

The modified backend files also reported no editor diagnostics, and `git diff --check` passed.

Source-level verification confirms that the inbound response contains:

```text
company_name
company_knowledge
phone_number_knowledge
phone_number_pdf_knowledge
```

The values are generated after the phone assignment has been resolved and the phone profile has been queried using both the resolved `company_id` and `phone_assignment_id`.

## Verification Limitations

The backend dynamic-variable implementation was verified from source and through the TypeScript build. No Retell prompt was modified.

The workspace did not have a usable live MongoDB configuration during inspection. Therefore the following could not be confirmed from live data:

- The current literal `companies.name` value for a real company.
- The current phone assignment records.
- Whether duplicate assignments exist in the deployed database.
- The actual Retell dashboard prompt contents.
- A real inbound phone call response.

The live Retell call cannot be claimed as verified until the deployed environment has valid MongoDB and Retell configuration and a real inbound call is executed.
