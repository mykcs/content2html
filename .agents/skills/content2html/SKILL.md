```markdown
# content2html Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and workflows for the `content2html` TypeScript codebase. You'll learn about the project's coding conventions, commit styles, file organization, and how to run and write tests. This guide is ideal for new contributors or anyone seeking to align with the repository's established practices.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `parseContent.ts`, `htmlRenderer.ts`

### Import Style
- Use **absolute imports** rather than relative paths.
  - Example:
    ```typescript
    import { parseContent } from 'utils/parseContent';
    ```

### Export Style
- Use **named exports** instead of default exports.
  - Example:
    ```typescript
    // Good
    export function parseContent() { ... }

    // Avoid
    // export default function parseContent() { ... }
    ```

### Commit Messages
- Follow **Conventional Commits** with prefixes like `feat` and `fix`.
  - Example:
    ```
    feat: add support for custom HTML tags
    fix: resolve issue with content parsing edge cases
    ```

## Workflows

### Adding a New Feature
**Trigger:** When implementing new functionality.
**Command:** `/add-feature`

1. Create a new TypeScript file using camelCase naming.
2. Use absolute imports for dependencies.
3. Export your functions or classes using named exports.
4. Write or update corresponding tests in a `*.test.ts` file.
5. Commit your changes using the `feat:` prefix.
    ```
    feat: implement feature for X
    ```

### Fixing a Bug
**Trigger:** When resolving a bug or issue.
**Command:** `/fix-bug`

1. Locate the relevant code and make necessary changes.
2. Ensure all imports are absolute and exports are named.
3. Update or add tests to cover the bug fix.
4. Commit your changes using the `fix:` prefix.
    ```
    fix: correct parsing error for empty content
    ```

### Running Tests
**Trigger:** To verify code correctness.
**Command:** `/run-tests`

1. Identify test files matching the `*.test.*` pattern.
2. Use the project's test runner (framework unknown; check project documentation or scripts).
3. Run all tests and ensure they pass before pushing changes.

## Testing Patterns

- Test files follow the `*.test.*` naming convention (e.g., `parseContent.test.ts`).
- The specific testing framework is not detected; check the repository for scripts or documentation.
- Place tests alongside or near the code they test for clarity and maintainability.

## Commands
| Command      | Purpose                                |
|--------------|----------------------------------------|
| /add-feature | Start the workflow for adding features  |
| /fix-bug     | Start the workflow for fixing bugs      |
| /run-tests   | Run all project tests                   |
```
