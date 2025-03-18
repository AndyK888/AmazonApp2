# Docker Setup for Amazon Inventory Management App

This document describes how to run the Amazon Inventory Management application using Docker.

## Prerequisites

- Docker installed on your machine
- Docker Compose installed on your machine

## Quick Start

The application has been containerized and can be managed using the included `docker-manage.sh` script.

### Start the application:

```bash
./docker-manage.sh start
```

This will start the containers in detached mode, making the application available at http://localhost:3000.

### Stop the application:

```bash
./docker-manage.sh stop
```

### View logs:

```bash
# View frontend logs
./docker-manage.sh logs

# View database logs
./docker-manage.sh logs db
```

### Check status:

```bash
./docker-manage.sh status
```

### Restart the application:

```bash
./docker-manage.sh restart
```

### Rebuild the application:

If you've made changes to the code and need to rebuild the Docker image:

```bash
./docker-manage.sh rebuild
```

## Database Management

The application uses PostgreSQL for data storage. The database is run in a separate Docker container.

### Connect to the database:

```bash
./docker-manage.sh psql
```

This opens a PostgreSQL interactive shell.

### Backup the database:

```bash
./docker-manage.sh backup
```

This creates a backup file in the `db/backups` directory.

### Restore the database:

```bash
./docker-manage.sh restore db/backups/your-backup-file.dump
```

## Manual Docker Commands

If you prefer to use Docker commands directly:

### Build the Docker image:

```bash
docker-compose build
```

### Start the containers:

```bash
docker-compose up -d
```

### Stop the containers:

```bash
docker-compose down
```

### View container logs:

```bash
# Frontend logs
docker logs -f amazon-app-frontend-1

# Database logs
docker logs -f amazon-app-db-1
```

## Configuration

The Docker setup consists of:

### Frontend Service
- Node.js 20 Alpine image
- Production build of the React application
- Serve package to deliver the static files
- Port 3000 for accessing the application
- Health check to ensure the container is running properly

### Database Service
- PostgreSQL 14 Alpine image
- Persistent volume for data storage
- Initialization scripts in the `db/init` directory
- Port 5432 exposed for database connections
- Health check to ensure the database is running properly

## Environment Variables

### Frontend
- `NODE_ENV`: Set to "production" for production builds
- `DATABASE_URL`: Database connection string (automatically set for container communication)

### Database
- `POSTGRES_PASSWORD`: Database password (default: postgres)
- `POSTGRES_USER`: Database username (default: postgres)
- `POSTGRES_DB`: Database name (default: amazon_inventory)

## Persistent Data

Database data is stored in a named volume (`postgres_data`) to ensure data persistence between container restarts.

## Troubleshooting

1. If the application isn't available at http://localhost:3000, check if the containers are running:
   ```bash
   docker ps
   ```

2. If the containers aren't running, check the logs for errors:
   ```bash
   # Frontend logs
   docker logs amazon-app-frontend-1
   
   # Database logs
   docker logs amazon-app-db-1
   ```

3. If you need to rebuild the containers after code changes:
   ```bash
   ./docker-manage.sh rebuild
   ```

4. If the ports are already in use, you can modify the port mappings in `docker-compose.yml`.

5. Database connection issues:
   - Check the database logs: `./docker-manage.sh logs db`
   - Verify the connection string in the frontend container
   - Check if the database container is healthy: `docker ps` 