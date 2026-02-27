# admin_action_audit_log

Additive only. Creates table `admin_action_audit_log` for fintech-grade audit of sensitive admin actions (refund, chargeback, admin CRUD, consumer verification, exchange rate/rule changes). Append-only; no UPDATE/DELETE.

**Rollback:** Drop table `admin_action_audit_log` and indexes. Audit history is lost.
