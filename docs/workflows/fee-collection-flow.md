# Fee Collection Workflow

## Flow Diagram

```mermaid
flowchart TD
  A[Generate Fee Demand] --> B{Payment Channel}
  B -->|Online / Razorpay| C[Create Razorpay Order]
  B -->|Offline| D[Cashier Entry]
  C --> E[Parent pays via UPI/Card]
  E --> F[Razorpay Webhook payment.captured]
  F --> G{HMAC Verified?}
  G -->|No| H[Reject 400]
  G -->|Yes| I[Create FeePayment record]
  D --> J[Accountant verifies & records]
  J --> I
  I --> K[Allocate to components]
  K --> L{Fully Paid?}
  L -->|Yes| M[Update Demand status: paid]
  L -->|No| N[Update Demand status: partial]
  M --> O[Generate Receipt PDF]
  N --> O
  O --> P[Fire fee.payment.received event]
  P --> Q[Queue SMS receipt to parent]
  P --> R[Update daily dashboard]
```

## Business Rules

1. **GST**: Components with `gstApplicable=true` calculate GST separately; tuition is exempt.
2. **Partial payment**: Allocate to components in order (first component filled first).
3. **Cheque**: Recorded in `chequeRegister`; `isBounced` flag triggers reversal workflow.
4. **Late fee**: Auto-calculated when `dueDate` is past; added to `lateFee` field of demand.
5. **Concession**: Requires approval workflow before demand amount is reduced.
6. **Receipt number**: `{prefix}-{6-digit-sequence}` per branch, immutable once issued.

## Rollback Scenarios

| Scenario | Recovery |
|----------|----------|
| Razorpay webhook duplicate | Idempotency check on `gatewayOrderId` |
| Cheque bounce | `isBounced=true`, reverse allocation, re-open demand |
| DB write fails after gateway capture | Idempotency key prevents re-creation on retry |
