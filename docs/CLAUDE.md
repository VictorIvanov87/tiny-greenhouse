# CLAUDE.md — Docs

Project documentation: task tickets, architecture diagrams, and RAG source data.

## Directory layout

```
docs/
  tasks/          Development tickets (TG-NNN.md)
  rag/            RAG knowledge-base sources (seeded into pgvector)
  tiny-greenhouse-dataflow.png    System data flow diagram
  tiny-greenhouse-sequence.png    Request/response sequence diagram
```

## Task tickets (`tasks/TG-NNN.md`)

All non-trivial work has a corresponding ticket. Tickets are numbered sequentially (TG-001 … TG-037+).

Typical ticket structure:
```markdown
# TG-NNN — Short title

## Goal
What the task achieves.

## Background / Context
Why it is needed.

## Acceptance criteria
- [ ] Concrete, testable outcomes

## Implementation notes
Design decisions, constraints, API shapes, etc.
```

When starting work on a ticket:
1. Read the full ticket before touching any code
2. Note the acceptance criteria — those are the definition of done
3. Implementation notes often contain pre-approved design decisions; don't re-open closed questions

When writing a new ticket:
- Use the next available TG number
- Keep the Goal section to 2–3 sentences max
- List acceptance criteria as checkboxes so progress is trackable
- Capture any design decisions made during planning in Implementation notes

## RAG sources (`rag/`)

Markdown files used as the knowledge base for the AI assistant feature. They are chunked and embedded into pgvector by `backend/src/scripts/rag-seed.ts`.

If you add or update RAG sources, re-run the seed script:
```bash
cd backend && npm run rag:seed
```

## Diagrams

The PNG diagrams at the docs root are the canonical system architecture references. Regenerate them (e.g. from draw.io or Mermaid) if the data flow or sequence changes significantly.
