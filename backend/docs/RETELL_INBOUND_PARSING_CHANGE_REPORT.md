# Retell Inbound Parsing Change Report

Date: 2026-09-15
Commit: `f630b83 Fix Retell inbound payload parsing`

## 1. Exact files changed

- [backend/src/modules/retell/retell.inbound.ts](../src/modules/retell/retell.inbound.ts)
  - Added typed inbound payload parsing.
  - Added safe payload path/type diagnostics.
- [backend/src/modules/retell/retell.routes.ts](../src/modules/retell/retell.routes.ts)
  - Updated `POST /api/retell/inbound-call` to use the parser.
  - Added safe missing-field logging.
  - Preserved phone assignment lookup, tenant isolation, company context building, dynamic variables, and response behavior.

No Retell prompt, function endpoint, company-data logic, or telephony logic was changed.

## 2. Exact Retell payload fields and paths now read

The official Retell inbound-call webhook contract uses this nested shape:

```json
{
  "event": "call_inbound",
  "call_inbound": {
    "call_id": "call_12345",
    "from_number": "+12137771234",
    "to_number": "+12137771235"
  }
}
```

The parser now reads these paths in priority order:

- Call ID:
  1. `call_inbound.call_id`
  2. `call_id` as a compatibility fallback
- Caller number:
  1. `call_inbound.from_number`
  2. `from_number` as a compatibility fallback
- Called/destination number:
  1. `call_inbound.to_number`
  2. `call_inbound.destination_number` as a compatibility fallback
  3. `to_number` as a compatibility fallback
  4. `destination_number` as a compatibility fallback

The extracted destination number is then passed unchanged into the existing phone normalization and `phone_assignments` lookup.

## 3. Why the previous fields were null

The previous route only read:

```ts
const body = request.body as any;
const inbound = body.call_inbound || {};
const destinationNumber = inbound.to_number || inbound.destination_number;
```

Therefore, `destinationNumber` was null/undefined whenever the received request did not contain a usable string at `call_inbound.to_number` or `call_inbound.destination_number`. The previous code also read `call_inbound.call_id` only.

The local repository did not contain the actual production request body, so the exact production cause cannot be proven from local files alone. The official Retell documentation confirms that the standard path is `call_inbound.to_number` and `call_inbound.call_id`; it does not prove that the deployed request used a different shape.

The new code handles the documented nested shape and root-level compatibility shapes. If production still sends a different structure, the warning log now records only field paths and value types, never payload values, secrets, transcripts, employee data, signatures, or credentials.

## 4. Backend build result

Passed:

```text
> peoplix-backend@1.0.0 build
> tsc
```

The backend TypeScript compiler completed successfully after the change.

## 5. Test result

The compiled parser was tested with three representative cases:

### Official nested Retell shape

Input fields:

```text
call_inbound.call_id = "call_nested"
call_inbound.to_number = "+19786446144"
call_inbound.from_number = "+15550000000"
```

Result:

```json
{
  "callId": "call_nested",
  "fromNumber": "+15550000000",
  "destinationNumber": "+19786446144"
}
```

### Root-level compatibility shape

Input fields:

```text
call_id = "call_root"
to_number = "+19786446144"
from_number = "+15550000000"
```

Result:

```json
{
  "callId": "call_root",
  "fromNumber": "+15550000000",
  "destinationNumber": "+19786446144"
}
```

### Missing/malformed fields

Input fields:

```text
call_inbound.call_id = 7
call_inbound.to_number = null
```

Result:

```json
{
  "callId": null,
  "fromNumber": null,
  "destinationNumber": null
}
```

Safe diagnostic paths produced:

```text
:object
 event:string
 call_inbound:object
 call_inbound.call_id:number
 call_inbound.to_number:null
```

No live production request or production database was available locally, so the test could not independently prove that the production `phone_assignments` row resolves to a specific company. After deployment, the inbound log should show non-null `callId` and `destinationNumber`, followed by `companyId`, `companyName`, and `phoneAssignmentId` when the assignment exists.

## Expected production flow

```text
Retell call_inbound payload
  -> call_inbound.to_number
  -> phone number normalization
  -> active phone_assignments lookup
  -> company_id
  -> companies.name
  -> buildCompanyCallContext()
  -> dynamic_variables
  -> call_inbound response
```
