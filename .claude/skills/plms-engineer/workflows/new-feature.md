# New Feature Workflow

1. Inspect existing feature patterns and related modules.
2. Define user value, scope, assumptions, acceptance criteria, and edge cases.
3. Design the smallest compatible architecture.
4. Decide route/server/client boundaries.
5. Define types and validation.
6. Define API/service/data changes.
7. Define authorization/RLS implications.
8. Implement incrementally.
9. Validate type/lint/tests/build as applicable.
10. Review the final diff for regression, security, duplication, and unnecessary complexity.

Do not create a new abstraction until the existing codebase proves the need.
