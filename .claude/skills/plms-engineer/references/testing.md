# PLMS Testing Reference

Test behavior and business rules, not implementation details.

## Minimum expectations
- Regression coverage for non-trivial bug fixes when the repository has a suitable test setup.
- Unit/integration coverage for validation, permissions, data transformations, and business rules.
- UI tests for important user-visible behavior where an established framework exists.
- For auth/security changes, test allowed and denied roles/paths.
- For data mutations, test success, validation failure, authorization failure, and not-found behavior.
