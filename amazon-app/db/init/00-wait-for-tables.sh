#!/bin/bash
set -e

# Configuration
PGUSER=${POSTGRES_USER:-postgres}
PGPASSWORD=${POSTGRES_PASSWORD:-postgres}
PGDATABASE=${POSTGRES_DB:-amazon_inventory}
MAX_RETRIES=30
RETRY_INTERVAL=5

# Tables that must exist in the database
REQUIRED_TABLES=(
  "listings"
  "uploaded_files"
  "identifier_changes"
  "product_identifiers"
  "duplicate_items"
  "duplicate_sku_issues"
)

# Function to check if a table exists
check_table_exists() {
  local table=$1
  psql -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q 't'
  return $?
}

# Function to verify all required tables exist
check_all_tables() {
  for table in "${REQUIRED_TABLES[@]}"; do
    echo "Checking for table: $table"
    if ! check_table_exists "$table"; then
      echo "Table $table does not exist!"
      return 1
    fi
  done
  echo "All required tables exist!"
  return 0
}

# Function to run initialization scripts if not already executed
run_init_scripts_if_needed() {
  echo "Running initialization scripts..."
  
  # Check if listings table already exists (to avoid running scripts on existing database)
  if ! check_table_exists "listings"; then
    echo "Running 01-init.sql..."
    psql -U "$PGUSER" -d "$PGDATABASE" -f /docker-entrypoint-initdb.d/01-init.sql
  else
    echo "Listings table already exists, skipping 01-init.sql"
  fi

  # Check if uploaded_files table already exists
  if ! check_table_exists "uploaded_files"; then
    echo "Running 02-uploads-table.sql..."
    psql -U "$PGUSER" -d "$PGDATABASE" -f /docker-entrypoint-initdb.d/02-uploads-table.sql
  else
    echo "uploaded_files table already exists, skipping 02-uploads-table.sql"
  fi

  # Check if identifier_changes table already exists
  if ! check_table_exists "identifier_changes"; then
    echo "Running 03-identifier-tracking.sql..."
    psql -U "$PGUSER" -d "$PGDATABASE" -f /docker-entrypoint-initdb.d/03-identifier-tracking.sql
  else
    echo "identifier_changes table already exists, skipping 03-identifier-tracking.sql"
  fi

  # Check if duplicate_items table already exists
  if ! check_table_exists "duplicate_items"; then
    echo "Running 04-duplicates-tables.sql..."
    psql -U "$PGUSER" -d "$PGDATABASE" -f /docker-entrypoint-initdb.d/04-duplicates-tables.sql
  else
    echo "duplicate_items table already exists, skipping 04-duplicates-tables.sql"
  fi
}

# Main execution
echo "Waiting for database to be ready..."
until pg_isready -U "$PGUSER" -d "$PGDATABASE"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready! Checking tables..."

# Try to verify all tables exist
retries=0
until check_all_tables; do
  retries=$((retries + 1))
  
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    echo "Maximum retries reached. Could not verify all tables exist."
    echo "Running initialization scripts one more time..."
    run_init_scripts_if_needed
    
    if check_all_tables; then
      echo "Tables are now created successfully."
      exit 0
    else
      echo "Failed to initialize database tables after retry."
      exit 1
    fi
  fi
  
  echo "Not all required tables exist. Running initialization scripts..."
  run_init_scripts_if_needed
  
  echo "Waiting $RETRY_INTERVAL seconds before checking again..."
  sleep "$RETRY_INTERVAL"
done

echo "Database initialization complete!"
exit 0 