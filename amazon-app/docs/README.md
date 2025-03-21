# Documentation Directory

This directory contains documentation for the Amazon Inventory Management System.

## Contents

- `ARCHITECTURE.md` - Core architecture documentation, change management workflow, and rollback procedures
- `CHANGELOG.md` - Record of all changes made to the project
- `DOCKER_OPTIMIZATION.md` - Guide for optimizing Docker builds
- `CSS_BEST_PRACTICES.md` - CSS module architecture and styling guidelines

## Usage

Before making any changes to the system:

1. Review the architecture document to understand component dependencies
2. Follow the change management workflow outlined in `ARCHITECTURE.md`
3. Update the changelog after making changes
4. Create backups of critical files before making significant changes
5. For CSS-related changes, review the CSS best practices document

## Rollback Procedure

If something goes wrong during development or deployment, follow the rollback procedure in `ARCHITECTURE.md` to restore the system to a working state.

## CSS Implementation

When working with CSS in this project:

1. Always use the SafeStyles pattern for CSS modules (see `CSS_BEST_PRACTICES.md`)
2. Ensure webpack is properly configured for CSS modules
3. Follow the guidelines for handling third-party CSS libraries
4. Test CSS changes in both development and production environments