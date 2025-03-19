#!/bin/bash
set -e

# Configuration
PGUSER=${POSTGRES_USER:-postgres}
PGDATABASE=${POSTGRES_DB:-amazon_inventory}

# Tables that must exist in the database
REQUIRED_TABLES=(
  "listings"
  "uploaded_files"
  "identifier_changes"
  "product_identifiers"
  "duplicate_items"
  "duplicate_sku_issues"
)

# Check if all required tables exist
for table in "${REQUIRED_TABLES[@]}"; do
  if ! psql -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q 't'; then
    echo "Table $table does not exist!"
    exit 1
  fi
done

echo "All required tables exist!"
exit 0 