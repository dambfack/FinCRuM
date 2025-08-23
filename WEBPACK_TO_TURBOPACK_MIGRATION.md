# Turbopack Migration Report

This document outlines the process and challenges encountered during the migration from Webpack to Turbopack.

## Initial Attempt

The initial migration to Turbopack was blocked by `Module not found` errors for Node.js core modules like `fs` and `child_process`. These modules were being incorrectly bundled for the client-side.

## `resolveAlias` Attempt

An attempt was made to use Turbopack's `resolveAlias` feature to mock these server-side modules. This resulted in the server exiting silently without any error messages, making it difficult to debug.

## Dynamic Imports

The next approach was to use dynamic imports with `ssr: false` for components that use server-side modules. This was not a viable solution as the modules in question were not React components.

## Excluding Files from Build

The `Module not found` errors were resolved by excluding the Electron-related files (`electron.js`, `preload.js`, `build-installer.js`) from the Turbopack build process in `next.config.js`.

## HMR Issues with Turbopack

After resolving the `Module not found` errors, a new issue emerged with Turbopack's Hot Module Replacement (HMR). The browser console showed `unrecognized HMR message` errors, and the server logs showed `uncaughtException` errors related to HMR. This appears to be a known issue with Turbopack, and there is no clear solution at this time.

## Current Status

- The project is currently running with Webpack.
- The `--turbopack` flag has been removed from the `dev` script in `package.json`.
- The `next.config.js` file has been reverted to its original state, using the Webpack configuration.
- The Turbopack migration is currently paused due to the HMR issues.