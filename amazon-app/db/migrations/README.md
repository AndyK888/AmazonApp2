# Database Migrations

This directory contains database migration scripts for the Amazon Inventory Management application using Flyway.

## Migration Files

Migration files follow the Flyway naming convention:

```
V<version>__<description>.sql
```

For example:
- `V1__Initial_Schema.sql` - Creates the initial database schema
- `V2__Add_Categories_Table.sql` - Adds a new table for categories
- `V3__Add_User_Management.sql` - Adds user management functionality

## Running Migrations

### Using Docker Compose

```bash
# Run migrations with Docker Compose
docker-compose -f docker-compose.yml -f docker-compose.flyway.yml up flyway
```

### Using Flyway CLI directly

If you have Flyway CLI installed, you can run:

```bash
flyway -url=jdbc:postgresql://localhost:5432/amazon_inventory \
  -user=postgres \
  -password=postgres \
  -locations=filesystem:./migrations \
  migrate
```

## Migration Best Practices

1. **Never modify existing migrations**. Instead, create a new migration to adjust the schema.
2. **Keep migrations idempotent** when possible. Use `IF NOT EXISTS` and `IF EXISTS` clauses.
3. **Use descriptive names** for migration files.
4. **Test migrations** in a development environment before applying them to production.
5. **Include both UP and DOWN changes** where feasible (Flyway supports undo operations with commercial versions).
6. **Keep migrations small and focused** on specific changes.

## Creating New Migrations

To create a new migration:

1. Create a new SQL file in this directory with the proper naming convention:
   ```
   V<next_version>__<descriptive_name>.sql
   ```
   Where `<next_version>` is the next sequential version number.

2. Write your SQL migration script, following best practices.

3. Test the migration in a development environment.

4. Run the migration using one of the methods described above.

## Version Management

Flyway tracks which migrations have been applied in a special table called `flyway_schema_history`. This ensures migrations are only applied once and in the correct order.

To see which migrations have been applied:

```sql
SELECT * FROM flyway_schema_history ORDER BY installed_rank;
``` 