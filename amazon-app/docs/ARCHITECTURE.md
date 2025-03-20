# Amazon Inventory Management System - Core Architecture Documentation

## 1. System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Database     │◀────│     Worker      │
│    (Next.js)    │     │  (PostgreSQL)   │     │    (Python)     │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       │                       │
         └───────────▶Redis Cache◀───────────────────────┘
                      (Caching)
```

## 2. Component Dependencies

| Service   | Depends On    | Purpose                               |
|-----------|---------------|---------------------------------------|
| Frontend  | DB, Redis     | Web UI for inventory management       |
| Worker    | DB, Redis     | Process Amazon report files           |
| DB        | None          | Store inventory and metadata          |
| DB-init   | DB            | Initialize database schema            |
| Redis     | None          | Cache and message broker              |

## 3. Change Management Workflow

### 3.1 Pre-Change Checklist
- [ ] Document current state (running containers, versions)
- [ ] Create backup of configuration files
- [ ] Run `docker compose ps` to document current state
- [ ] Check git status and commit any pending changes

### 3.2 Implementation Process
1. Make single-purpose changes only
2. Test each change immediately after implementation
3. Document changes in a changelog
4. Commit working changes immediately after verification

### 3.3 Post-Change Verification
- [ ] Run `docker compose ps` to verify all services are running
- [ ] Check logs for each service (`docker compose logs <service>`)
- [ ] Verify frontend is accessible at http://localhost:3000
- [ ] Test affected functionality through UI
- [ ] Commit changes with descriptive message

## 4. Rollback Procedure

```
┌────────────────┐     ┌────────────────┐     ┌───────────────┐
│ Detect Failure │────▶│ Stop Services  │────▶│ Reset Changes │
└────────────────┘     └────────────────┘     └───────┬───────┘
                                                      │
┌────────────────┐     ┌────────────────┐     ┌───────▼───────┐
│ Document Issue │◀────│  Verify State  │◀────│ Restore Backup│
└────────────────┘     └────────────────┘     └───────────────┘
```

### 4.1 Step-by-Step Rollback
1. Stop all running containers: `docker compose down`
2. Restore docker-compose.yml from backup or git: `git checkout -- docker-compose.yml`
3. Restart services: `docker compose up -d`
4. Verify all services are running: `docker compose ps`

## 5. Git-Based Safety Measures

### 5.1 Branch Management
- Create feature branches for changes
- Use pull requests for major changes
- Require reviews before merging

### 5.2 Git Checkpoints
```bash
# Before starting work
git status                  # Check current state
git pull                    # Get latest changes

# Create safety branch
git checkout -b safety/$(date +%Y-%m-%d)

# After successful changes
git add -A
git commit -m "Detailed description of changes"
git push origin HEAD

# In case of issues
git checkout main           # Return to stable branch
```

## 6. Critical Files Checklist

| File Path | Purpose | Recovery Method |
|-----------|---------|----------------|
| docker-compose.yml | Container orchestration | `git checkout -- docker-compose.yml` |
| ./workers/report-processor/worker.py | Worker processing logic | `git checkout -- ./workers/report-processor/worker.py` |
| ./workers/report-processor/Dockerfile | Worker container config | `git checkout -- ./workers/report-processor/Dockerfile` |
| ./db/init/00-wait-for-tables.sh | Database initialization | `git checkout -- ./db/init/00-wait-for-tables.sh` |
| ./db/init/verify-tables-healthcheck.sh | Database health check | `git checkout -- ./db/init/verify-tables-healthcheck.sh` |

## 7. Testing Protocol

Before each deployment or significant change, verify:

1. Database connection and schema integrity
   ```bash
   docker compose exec db psql -U postgres -d amazon_inventory -c "SELECT COUNT(*) FROM listings"
   ```

2. Redis connectivity
   ```bash
   docker compose exec redis redis-cli ping
   ```

3. Worker processes
   ```bash
   docker compose logs --tail=20 worker
   ```

4. Frontend accessibility
   ```bash
   curl -I http://localhost:3000
   ```

## 8. External Requirements

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- Git

## 9. Application Structure

### 9.1 Microservices Overview

The application follows a microservices architecture with these key components:

- **Frontend Service**: Next.js application that provides the user interface
- **Database Service**: PostgreSQL database for persistent storage
- **Worker Service**: Python-based worker for processing report files
- **Redis Service**: Provides caching and messaging between services
- **DB Init Service**: Handles database initialization and migrations

### 9.2 Data Flow

1. User uploads Amazon inventory report file through frontend
2. Frontend sends file to backend API
3. File metadata is stored in database
4. Worker receives file processing task
5. Worker processes file and updates database
6. Frontend retrieves processed data from database

### 9.3 Critical Paths

- **Upload Processing**: Frontend → API → Worker → Database → Frontend
- **Data Retrieval**: Frontend → Database → Frontend
- **Data Modification**: Frontend → Database

### 9.4 Failure Points and Mitigations

| Component | Failure Impact | Mitigation |
|-----------|----------------|------------|
| Database | Data loss, system unavailable | Regular backups, health checks |
| Worker | Processing delays | Retry mechanism, error logging |
| Frontend | UI unavailable | Static fallback pages, error boundaries |
| Redis | Message loss | Persistence configuration, monitoring |