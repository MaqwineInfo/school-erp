# Admission Workflow

## Sequence Diagram

```mermaid
sequenceDiagram
  participant Parent
  participant API
  participant MongoDB
  participant Queue
  participant Razorpay
  participant SMS

  Parent->>API: POST /admissions/enquiries
  API->>MongoDB: Dedup check (phone+branch+year)
  MongoDB-->>API: Not found / Found
  API->>MongoDB: Insert Enquiry {status: new}
  API-->>Parent: 201 Enquiry created

  Note over Parent,API: Follow-up cycle
  Parent->>API: Visit school, counsellor updates
  API->>MongoDB: PATCH status: school-visit

  Parent->>API: POST /admissions/{id}/confirm
  API->>MongoDB: Create Student record
  API->>MongoDB: Create StudentEnrollment
  API->>MongoDB: Update Enquiry {status: admitted}
  API->>Queue: admission-saga job
  Queue->>SMS: Admission letter SMS to parent
  Queue->>SMS: Email notification
  API-->>Parent: 201 {student, enrollment}
```

## Business Rules

1. **Deduplication**: If phone + branch + academic year + status not in [admitted, lost], return existing enquiry.
2. **Admission saga**: Student creation + enrollment + notification must all succeed or compensate.
3. **RTE quota**: Separate workflow with category = 'ews' or 'sc'/'st' tracked via `isRteStudent`.
4. **Sibling discount**: Detected during fee demand generation by matching guardian phone.
5. **Idempotency**: `confirm` endpoint checks for existing student with same admissionNo.

## Exception Scenarios

| Exception | Recovery |
|-----------|----------|
| Payment captured but confirm failed | Webhook retry with idempotency key |
| Duplicate enquiry | Return existing with `{ duplicate: true }` |
| SMS delivery failure | Retry queue with 3 attempts, exponential backoff |
