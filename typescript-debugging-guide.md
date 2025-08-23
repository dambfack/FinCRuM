# TypeScript Error Debugging Guide for Agentic Coders

This guide provides a systematic approach to identifying and fixing TypeScript compilation errors in a codebase.

## Overview

The process involves iteratively identifying files with TypeScript errors, fixing them one by one, and verifying the fixes until the entire codebase compiles without errors.

## Step-by-Step Process

### Step 1: Generate Initial Error Log

Dump all TypeScript compiler errors to a log file:

```bash
npx tsc --noEmit > typescript-errors-current.log 2>&1
```

### Step 2: Extract Files with Errors

Read the log file and create a list of all files containing TypeScript errors. Save this list to a separate log file:

```bash
# Extract unique file paths from error log
grep -o "src/[^(]*" typescript-errors-current.log | sort | uniq > files-with-errors.log
```

### Step 3: Process Each File Individually

For each file in the error list:

#### 3.1 Compile Individual File
Run TypeScript compilation on the specific file to get detailed error information:

```bash
npx tsc --noEmit path/to/specific/file.ts
```

#### 3.2 Analyze and Fix Errors
- Review each error message carefully
- Identify the root cause (type mismatches, missing imports, incorrect method calls, etc.)
- Apply appropriate fixes:
  - Import missing types/modules
  - Correct type annotations
  - Fix method signatures
  - Update deprecated API usage
  - Resolve naming conflicts

#### 3.3 Verify Fix
Re-compile the file to ensure all errors are resolved:

```bash
npx tsc --noEmit path/to/specific/file.ts
```

#### 3.4 Update Progress
If no errors remain for the file:
- Update the debugging report/log
- Remove the file entry from `files-with-errors.log`
- Document the fixes applied

### Step 4: Repeat Until Complete

Continue steps 3.1-3.4 for each file in the list until all entries are cleared from `files-with-errors.log`.

### Step 5: Final Verification

Perform a complete TypeScript compilation of the entire codebase:

```bash
npx tsc --noEmit > typescript-errors-final.log 2>&1
```

### Step 6: Handle Remaining Errors

If errors still exist after processing all files:
- The errors may be due to interdependencies between files
- New errors may have been introduced during fixes
- **Repeat the entire process (Steps 1-5) until no errors remain**

## Best Practices

### Error Prioritization
1. **Import/Export errors** - Fix these first as they often cascade
2. **Type definition errors** - Resolve missing or incorrect type definitions
3. **Method signature errors** - Fix incorrect function/method calls
4. **Property access errors** - Resolve missing or incorrectly named properties

### Common Error Types and Solutions

#### TS2345: Argument type mismatch
- Check function signatures
- Ensure correct parameter types
- Verify enum usage vs string literals

#### TS2339: Property does not exist
- Check import statements
- Verify object/class definitions
- Ensure correct property names

#### TS2554: Expected X arguments, got Y
- Review function call parameters
- Check for missing required arguments
- Verify optional parameter usage

#### TS2322: Type assignment errors
- Check variable type annotations
- Ensure compatible type assignments
- Review return type declarations

### Documentation

Maintain a log of:
- Files processed
- Errors encountered
- Solutions applied
- Time taken per file
- Any patterns or recurring issues

## Success Criteria

The process is complete when:
1. `typescript-errors-final.log` contains no compilation errors
2. All files in `files-with-errors.log` have been processed and removed
3. The entire codebase compiles successfully with `npx tsc --noEmit`

## Notes for Agentic Coders

- **Be systematic**: Process one file at a time to avoid confusion
- **Verify each fix**: Always re-compile after making changes
- **Document changes**: Keep track of what was modified and why
- **Test incrementally**: Ensure fixes don't break other parts of the code
- **Be patient**: Some errors may require multiple iterations to resolve
- **Look for patterns**: Similar errors across files often have similar solutions

## Emergency Procedures

If the process seems to loop indefinitely:
1. Check for circular dependencies
2. Review recent changes for unintended side effects
3. Consider reverting problematic changes and re-applying them more carefully
4. Examine the TypeScript configuration for potential issues

This systematic approach ensures comprehensive error resolution while maintaining code quality and preventing regression issues.