#!/bin/bash

# Docker management script for Amazon Inventory Management App

case "$1" in
  start)
    echo "Starting Amazon Inventory App container..."
    docker-compose up -d
    ;;
  stop)
    echo "Stopping Amazon Inventory App container..."
    docker-compose down
    ;;
  restart)
    echo "Restarting Amazon Inventory App container..."
    docker-compose down
    docker-compose up -d
    ;;
  logs)
    if [ "$2" == "db" ]; then
      echo "Showing logs for PostgreSQL container..."
      docker logs -f amazon-app-db-1
    else
      echo "Showing logs for Amazon Inventory App container..."
      docker logs -f amazon-app-frontend-1
    fi
    ;;
  status)
    echo "Status of Amazon Inventory App containers:"
    docker ps -a --filter "name=amazon-app"
    ;;
  rebuild)
    echo "Rebuilding Amazon Inventory App container..."
    docker-compose down
    docker-compose build
    docker-compose up -d
    ;;
  psql)
    echo "Connecting to PostgreSQL container..."
    docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory
    ;;
  backup)
    echo "Backing up PostgreSQL database..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="./db/backups"
    mkdir -p $BACKUP_DIR
    docker exec amazon-app-db-1 pg_dump -U postgres -d amazon_inventory -F c > "$BACKUP_DIR/amazon_inventory_$TIMESTAMP.dump"
    echo "Backup saved to $BACKUP_DIR/amazon_inventory_$TIMESTAMP.dump"
    ;;
  restore)
    if [ -z "$2" ]; then
      echo "Usage: $0 restore <backup_file>"
      exit 1
    fi
    echo "Restoring PostgreSQL database from $2..."
    docker exec -i amazon-app-db-1 pg_restore -U postgres -d amazon_inventory -c < "$2"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs [db]|status|rebuild|psql|backup|restore <backup_file>}"
    exit 1
esac

exit 0 