## Summary

Provide a concise description of the changes introduced in this pull request.

## Related Issue

Fixes #<!-- Issue number if applicable -->

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Security hardening (vulnerability mitigation or boundary enforcement)
- [ ] Performance improvement (CPU, memory, or bundle optimization)
- [ ] Refactoring / Code cleanup (no behavioral changes)
- [ ] Documentation update

## Verification & Testing

Please verify that the following checks pass before requesting review:

- [ ] Ran `npx tsc --noEmit` with zero type errors.
- [ ] Ran `npm test` and all automated test suites pass.
- [ ] Ran `npm run build:electron` and confirmed artifact generation.
- [ ] Ran `npm --prefix website run build` (if website components were modified).
- [ ] Verified that changes do not introduce emojis in code, commits, or documentation.
- [ ] Verified IPC sender validation (`isTrustedSender`) for any newly added or modified IPC channels.

## Testing Details

Describe the specific steps or test cases used to verify this change:
1.
2.
