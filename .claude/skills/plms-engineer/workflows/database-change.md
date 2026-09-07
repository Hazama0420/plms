# Database Change Workflow

1. Inspect current schema/query/RLS patterns.
2. Identify affected tables, relations, indexes, policies, services, and UI consumers.
3. Plan forward and failure behavior.
4. Implement the smallest safe change.
5. Validate authorization and expected result sets.
6. For performance changes, establish baseline and re-measure.
7. Review migration/RLS changes carefully before considering the work complete.
