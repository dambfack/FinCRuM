# Webpack to Turbopack Migration Guide

This document outlines the steps taken to migrate the FinCRuM application from Webpack to Turbopack, addressing the challenges encountered during the process.

## 1. Issue: `Module not found` errors with Turbopack

When running the development server with `next dev --turbopack`, the build fails with multiple `Module not found` errors for Node.js built-in modules like `child_process`, `fs`, `net`, and `tls`.

### Root Cause

These modules are part of the Node.js runtime and are not available in the browser environment. Turbopack, like Webpack, needs to be configured to handle these server-side dependencies correctly and prevent them from being bundled into the client-side code where they would cause errors.

### Resolution

To resolve this, we attempted to use Turbopack's `resolveAlias` feature in `next.config.js` to alias the server-side modules to an empty module on the client.

However, the `resolveAlias` configuration caused the development server to exit unexpectedly without providing clear error messages. After several attempts, the decision was made to revert the changes to maintain a stable development environment.

**Current Status:**
- The `--turbopack` flag has been removed from the `dev` script in `package.json`.
- The application is running successfully with the Webpack bundler.
- The `next.config.js` file has been reverted to its previous state, using the `webpack` configuration to handle server-side modules.

Further investigation is required to find a compatible solution for using Turbopack.