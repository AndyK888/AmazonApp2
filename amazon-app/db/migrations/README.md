# Database Migrations

This directory contains database migrations managed by Flyway.

## Migration Files

Migrations files should follow these conventions:

1. **Versioned Migrations**: Named using the pattern `V{version}__{description}.sql` where:
   - `{version}` is a number (e.g., 1, 2, 3)
   - `{description}` uses underscores instead of spaces
   
   Example: `V1__Initial_Schema.sql`

2. **Repeatable Migrations**: Named using the pattern `R__{description}.sql`

## Current Migrations

- `V1__Initial_Schema.sql`: Base schema with tables and indices
- `V2__Identifier_Changes_Duplicates.sql`: Adds views for duplicate detection

## Running Migrations

Migrations are applied automatically during container startup. To manually run migrations:

```
docker-compose -f docker-compose.yml -f docker-compose.flyway.yml up flyway
```

## Checking Migration Status

To check the migration status:

```
docker exec amazon-app-db-1 psql -U postgres -d amazon_inventory -c "SELECT * FROM flyway_schema_history;"
```

## Creating New Migrations

1. Create a new SQL file following the naming convention
2. Add your SQL statements to create/modify database objects
3. Test your migration locally
4. Run Flyway to apply the migration

## Important Notes

- Always ensure that migrations are idempotent where possible
- Use `IF NOT EXISTS` clauses for creating objects
- Database schema is versioned and tracked in the `flyway_schema_history` table
- Avoid modifying or renaming existing migration files 
- Ensure column names in validation scripts match actual database schema
  - The `listings` table uses hyphenated column names (e.g., `seller-sku`, `item-name`)
  - Validation scripts like `verify-tables-healthcheck.sh` must use these exact names
  - If validation failures occur, verify the actual column names using `\d listings` in psql 