# Documentation workflow

Braino should never become a product only its builder understands.

Every meaningful update gets two records:

- An internal document in this folder, with implementation details and decisions.
- A public page written for a person meeting the feature for the first time.

The public page metadata lives in `src/lib/brainoKnowledge.ts`. That registry powers the Knowledge Base index and the chronological **Everything New with Braino** feed.

## Definition of documented

A feature is documented when:

- Its purpose is clear.
- A normal person can understand how to use it.
- Important limitations are honest.
- Its technical shape is recorded.
- Its release date and status appear in the public registry.
- It has a permanent public URL.

