# Tagging: document_tag and resource_tag

Adds tagging for documents and resources via document_tag and resource_tag tables.

**Reference:** Feature schema; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Creates table document_tag (id, name unique).
- Creates table resource_tag (id, resource_id, tag_id) with unique (resource_id, tag_id).
- Adds FKs: resource_tag.resource_id → resource, resource_tag.tag_id → document_tag (ON DELETE RESTRICT, ON UPDATE CASCADE).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that uses tags.

## Rollback

Drop table resource_tag then document_tag (or in one step if no dependencies). All tag and resource-tag data is lost.