# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Architecture documentation in `docs/ARCHITECTURE.md`
- Change management workflow and procedures
- System component dependency documentation
- Rollback procedures for emergency situations
- Docker build optimization guide in `docs/DOCKER_OPTIMIZATION.md`
- Build script for optimized Docker builds
- CSS module handling documentation in README.md and TROUBLESHOOTING.md
- SafeStyles pattern implementation for CSS module error resilience
- Updated webpack configuration for proper CSS module handling

### Changed
- Optimized Dockerfiles for frontend and worker services
- Updated docker-compose.yml to use BuildKit and cache properly
- Added .dockerignore file to reduce build context size
- Improved multi-stage builds with parallel execution
- Implemented cache mounts for faster dependency installation
- Fixed CSS module loading issues in all React components
- Modified Next.js webpack configuration to handle CSS from node_modules properly
- Implemented fallback CSS classes using safeStyles pattern in all components

### Fixed
- CSS parsing errors with third-party libraries like Handsontable
- Component rendering errors when CSS modules fail to load properly
- Server-side rendering issues with CSS modules
- Styling inconsistencies between development and production builds

## [0.1.0] - 2025-03-20

### Added
- Initial version of Amazon Inventory Management application
- Web frontend using Next.js
- Report processing worker in Python
- PostgreSQL database for inventory data
- Redis for caching and message processing
- Docker and Docker Compose configuration for all services