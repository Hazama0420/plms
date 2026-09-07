<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Project Context Loading

Before starting any task:

1. Read `CURRENT_STATE.md` to determine the actual current project phase.
2. Read `PROJECT_MAP.md` when route, API, service, component, or project navigation is needed.
3. Read only the CRM documents relevant to the current task.
4. Inspect only source files required for the task.
5. Do not scan the entire repository unless the task is explicitly an audit.
6. Do not repeat completed phases unless verification shows they are incomplete.
7. Never treat absence from a migration file as proof that a table or column is absent from the live database.
8. For database/schema changes, verify the live schema before creating a migration.
9. Treat `CURRENT_STATE.md` as project-progress truth.
10. Treat source code, migrations, and verified live database state as implementation truth.

## Project State Handover

`CURRENT_STATE.md` is the shared handover document for all AI agents.

At the end of every meaningful task:

1. Review `CURRENT_STATE.md`.
2. Update it when the project state has changed.
3. Record:
   - current task
   - completed work
   - work still in progress
   - blockers
   - important discoveries
   - important decisions
   - recently changed files
   - next recommended step
4. Do not record guesses as facts.
5. Distinguish:
   - VERIFIED
   - UNVERIFIED
   - BLOCKED
   - COMPLETED
6. Keep the file concise. Do not copy source code or long explanations into it.
7. Do not update it for trivial changes such as formatting or typo fixes unless they affect project state.
8. Update it before reporting the task as complete.

## Agent Handover Rule

When starting a new task:

1. Read `CURRENT_STATE.md`.
2. Continue from the recorded state instead of reconstructing project history from old chat messages.
3. Verify the current repository before relying on a previous agent's claims.
4. Do not assume another agent's "completed" status is correct without checking when the task affects security, database schema, or data integrity.