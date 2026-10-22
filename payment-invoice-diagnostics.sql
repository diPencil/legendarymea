-- ============================================================================
-- Payment -> Invoice settlement integrity diagnostics (READ-ONLY)
-- Safe to run on production: contains SELECTs only. No writes, no locks beyond
-- ordinary consistent reads. Run via a read-only user or replica.
--
-- HOW TO USE:
-- 1. Section A: replace @payment_reference with the payment reference the user
--    recorded (e.g. 'LM-PAY-2026-000123').
-- 2. Section B: replace @invoice_reference with the invoice reference that
--    "does not reflect" the payment.
-- 3. Sections C1-C6: run as-is. They are global; empty result = healthy.
--
-- All set-based placeholders (@var) are provided in the first SELECT; adjust
-- and re-run each section independently. Works on MySQL 8+ and MariaDB 10.4+.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION A: Payment-centric trace
-- ---------------------------------------------------------------------------
SET @payment_reference = 'LM-PAY-2026-000123';

-- A1. The payment row itself + its denormalized allocation totals
SELECT
    p.id,
    p.reference,
    p.invoice_id,
    p.company_id,
    p.customer_type,
    p.status,
    p.amount,
    p.allocated_amount,
    p.unallocated_amount,
    p.currency,
    p.method,
    p.paid_at,
    p.reversed_at,
    p.reversal_reason,
    p.idempotency_key,
    p.created_at
FROM payments p
WHERE p.reference = @payment_reference;

-- A2. The invoice the payment points at, with expected settlement values
SELECT
    i.id,
    i.reference,
    i.status            AS stored_status,
    i.currency,
    i.total_amount,
    i.due_date,
    COALESCE(alloc.total_amount, 0) + COALESCE(direct.total_amount, 0) AS computed_paid,
    GREATEST(0, i.total_amount - (COALESCE(alloc.total_amount, 0) + COALESCE(direct.total_amount, 0))) AS computed_balance_due,
    (i.status = CASE
        WHEN (COALESCE(alloc.total_amount, 0) + COALESCE(direct.total_amount, 0)) >= i.total_amount THEN 'paid'
        WHEN (COALESCE(alloc.total_amount, 0) + COALESCE(direct.total_amount, 0)) > 0
             AND i.due_date < CURDATE() THEN 'overdue'
        WHEN (COALESCE(alloc.total_amount, 0) + COALESCE(direct.total_amount, 0)) > 0 THEN 'partially_paid'
        WHEN i.due_date < CURDATE() THEN 'overdue'
        ELSE 'issued'
    END) AS status_matches_settlement
FROM payments p
JOIN invoices i ON i.id = p.invoice_id
LEFT JOIN (
    SELECT a.invoice_id, SUM(a.amount) AS total_amount
    FROM payment_allocations a
    JOIN payments p2 ON p2.id = a.payment_id
    WHERE p2.status = 'posted'
      AND a.reversed_at IS NULL
    GROUP BY a.invoice_id
) alloc ON alloc.invoice_id = i.id
LEFT JOIN (
    SELECT p3.invoice_id, SUM(p3.amount) AS total_amount
    FROM payments p3
    WHERE p3.status = 'posted'
      AND p3.reversed_at IS NULL
      AND p3.invoice_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM payment_allocations a
          WHERE a.payment_id = p3.id
            AND a.invoice_id = p3.invoice_id
            AND a.reversed_at IS NULL
      )
    GROUP BY p3.invoice_id
) direct ON direct.invoice_id = i.id
WHERE p.reference = @payment_reference;

-- A3. Every allocation made from this payment
SELECT
    a.id,
    a.invoice_id,
    i.reference   AS invoice_reference,
    i.status      AS invoice_status,
    a.amount,
    a.reversed_at,
    a.reversal_reason,
    a.notes,
    a.created_at
FROM payment_allocations a
JOIN payments p  ON p.id = a.payment_id
JOIN invoices i  ON i.id = a.invoice_id
WHERE p.reference = @payment_reference
ORDER BY a.id;

-- ---------------------------------------------------------------------------
-- SECTION B: Invoice-centric trace  (replace the invoice reference)
-- ---------------------------------------------------------------------------
SET @invoice_reference = 'LM-INV-2026-000123';

-- B1. All DIRECT posted payments stored against this invoice
SELECT
    p.id,
    p.reference,
    p.status,
    p.amount,
    p.allocated_amount,
    p.unallocated_amount,
    p.currency,
    p.paid_at,
    p.reversed_at,
    (SELECT COUNT(*) FROM payment_allocations a WHERE a.payment_id = p.id) AS allocation_rows
FROM payments p
JOIN invoices i ON i.id = p.invoice_id
WHERE i.reference = @invoice_reference
ORDER BY p.id;

-- B2. All ACTIVE allocations referencing this invoice
--     (payments.invoice_id may be NULL for multi-invoice / credit payments)
SELECT
    a.id,
    p.reference    AS payment_reference,
    p.invoice_id   AS payment_direct_invoice_id,
    p.company_id,
    p.status       AS payment_status,
    p.currency     AS payment_currency,
    a.amount,
    a.reversed_at,
    a.created_at
FROM payment_allocations a
JOIN payments p  ON p.id = a.payment_id
JOIN invoices i  ON i.id = a.invoice_id
WHERE i.reference = @invoice_reference
  AND (p.status = 'posted' OR a.reversed_at IS NOT NULL)
ORDER BY a.id;

-- B3. One-row summary: what the API serves vs what the DB holds
SELECT
    i.reference,
    i.status                AS api_status,
    i.total_amount,
    i.currency,
    i.due_date,
    COALESCE(alloc.total_amount, 0) + COALESCE(direct.total_amount, 0) AS computed_paid_amount,
    GREATEST(0, i.total_amount - (COALESCE(alloc.total_amount, 0) + COALESCE(direct.total_amount, 0))) AS computed_balance_due
FROM invoices i
LEFT JOIN (
    SELECT a.invoice_id, SUM(a.amount) AS total_amount
    FROM payment_allocations a
    JOIN payments p ON p.id = a.payment_id
    WHERE p.status = 'posted'
      AND a.reversed_at IS NULL
    GROUP BY a.invoice_id
) alloc  ON alloc.invoice_id = i.id
LEFT JOIN (
    SELECT p.invoice_id, SUM(p.amount) AS total_amount
    FROM payments p
    WHERE p.status = 'posted'
      AND p.reversed_at IS NULL
      AND p.invoice_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM payment_allocations a
          WHERE a.payment_id = p.id
            AND a.invoice_id = p.invoice_id
            AND a.reversed_at IS NULL
      )
    GROUP BY p.invoice_id
) direct ON direct.invoice_id = i.id
WHERE i.reference = @invoice_reference;

-- ---------------------------------------------------------------------------
-- SECTION C: Global anomaly sweeps (empty result = healthy)
-- ---------------------------------------------------------------------------

-- C1. Multi-invoice payments with an amount sitting unallocated (by design,
--     these can look like "payment recorded but invoice not updated":
--     the money is company credit until it is applied via allocations).
SELECT
    p.id,
    p.reference,
    p.company_id,
    p.amount,
    p.allocated_amount,
    p.unallocated_amount,
    p.currency,
    p.status,
    p.paid_at,
    (SELECT COUNT(*) FROM payment_allocations a
      WHERE a.payment_id = p.id AND a.reversed_at IS NULL) AS active_allocations
FROM payments p
WHERE p.status = 'posted'
  AND p.reversed_at IS NULL
  AND p.invoice_id IS NULL
  AND p.unallocated_amount > 0
ORDER BY p.paid_at DESC;

-- C2. Direct single-invoice payments whose active allocation is missing or
--     mismatched (backfill/regression anomaly).
SELECT
    p.id,
    p.reference,
    p.invoice_id,
    p.amount,
    p.status,
    COALESCE(SUM(CASE WHEN a.reversed_at IS NULL THEN a.amount END), 0) AS active_allocation_total,
    COUNT(a.id) AS allocation_rows
FROM payments p
LEFT JOIN payment_allocations a ON a.payment_id = p.id AND a.invoice_id = p.invoice_id
WHERE p.status = 'posted'
  AND p.invoice_id IS NOT NULL
GROUP BY p.id, p.reference, p.invoice_id, p.amount, p.status
HAVING active_allocation_total <> p.amount
    OR allocation_rows <> 1;

-- C3. Stored invoice status disagreeing with computed settlement
--     (allocations take precedence; direct payments only when no allocation
--      exists for that invoice - mirrors InvoiceSettlementService logic).
SELECT
    i.id,
    i.reference,
    i.status                      AS stored_status,
    i.total_amount,
    i.currency,
    (CASE
        WHEN alloc.has_any THEN COALESCE(alloc.total_amount, 0)
        ELSE COALESCE(direct.total_amount, 0)
    END)                           AS computed_paid,
    (
        CASE
            WHEN alloc.has_any THEN COALESCE(alloc.total_amount, 0)
            ELSE COALESCE(direct.total_amount, 0)
        END
    ) >= i.total_amount            AS should_be_paid,
    (
        (CASE
            WHEN alloc.has_any THEN COALESCE(alloc.total_amount, 0)
            ELSE COALESCE(direct.total_amount, 0)
        END)
    ) > 0                          AS has_any_payment
FROM invoices i
LEFT JOIN (
    SELECT a.invoice_id, SUM(a.amount) AS total_amount, TRUE AS has_any
    FROM payment_allocations a
    JOIN payments p ON p.id = a.payment_id
    WHERE p.status = 'posted'
      AND a.reversed_at IS NULL
    GROUP BY a.invoice_id
) alloc ON alloc.invoice_id = i.id
LEFT JOIN (
    SELECT p.invoice_id, SUM(p.amount) AS total_amount, TRUE AS has_any
    FROM payments p
    WHERE p.status = 'posted'
      AND p.reversed_at IS NULL
    GROUP BY p.invoice_id
) direct ON direct.invoice_id = i.id
WHERE i.status IN ('issued', 'partially_paid', 'paid', 'overdue')
  AND i.status <> CASE
        WHEN ((CASE WHEN alloc.has_any THEN COALESCE(alloc.total_amount, 0)
                    ELSE COALESCE(direct.total_amount, 0) END)) >= i.total_amount THEN 'paid'
        WHEN ((CASE WHEN alloc.has_any THEN COALESCE(alloc.total_amount, 0)
                    ELSE COALESCE(direct.total_amount, 0) END)) > 0
             AND i.due_date < CURDATE() THEN 'overdue'
        WHEN ((CASE WHEN alloc.has_any THEN COALESCE(alloc.total_amount, 0)
                    ELSE COALESCE(direct.total_amount, 0) END)) > 0 THEN 'partially_paid'
        WHEN i.due_date < CURDATE() THEN 'overdue'
        ELSE 'issued'
      END
ORDER BY i.id;

-- C4. Reversal state mismatches between payments and their allocations
SELECT
    p.id,
    p.reference,
    p.status,
    p.reversed_at   AS payment_reversed_at,
    a.id            AS allocation_id,
    a.invoice_id,
    a.reversed_at   AS allocation_reversed_at
FROM payments p
JOIN payment_allocations a ON a.payment_id = p.id
WHERE (p.reversed_at IS NOT NULL AND a.reversed_at IS NULL AND p.status = 'reversed')
   OR (p.status = 'posted' AND p.reversed_at IS NULL AND a.reversed_at IS NOT NULL)
ORDER BY p.id, a.id;

-- C5. Active allocations exceeding an invoice's total (over-allocation)
SELECT
    i.id,
    i.reference,
    i.total_amount,
    alloc.total_amount AS active_allocations_total
FROM invoices i
JOIN (
    SELECT a.invoice_id, SUM(a.amount) AS total_amount
    FROM payment_allocations a
    JOIN payments p ON p.id = a.payment_id
    WHERE p.status = 'posted'
      AND a.reversed_at IS NULL
    GROUP BY a.invoice_id
) alloc ON alloc.invoice_id = i.id
WHERE alloc.total_amount > i.total_amount + 0.0005
ORDER BY i.id;

-- C6. Allocation applied to an invoice whose currency differs from the source
--     payment (should be impossible; applyCredit validates currency match).
SELECT
    a.id,
    a.payment_id,
    p.reference     AS payment_reference,
    p.currency      AS payment_currency,
    a.invoice_id,
    i.reference     AS invoice_reference,
    i.currency      AS invoice_currency,
    a.amount,
    a.reversed_at
FROM payment_allocations a
JOIN payments p ON p.id = a.payment_id
JOIN invoices i ON i.id = a.invoice_id
WHERE i.currency <> p.currency
LIMIT 50;
