# Amazon-fulfilled Inventory Service Tests

This directory contains tests for the Amazon-fulfilled Inventory microservice.

## Test Structure

- `test_api.py` - Tests for the API endpoints and their responses
- `test_processor.py` - Tests for the report processor module
- `test_database.py` - Tests for the database operations
- `test_main.py` - Tests for the main FastAPI application
- `test_models.py` - Tests for the data models (Pydantic models)
- `conftest.py` - Shared fixtures and test configuration

## Running Tests

To run all tests, from the project root directory:

```bash
pytest -v
```

To run a specific test file:

```bash
pytest -v tests/test_api.py
```

To run a specific test:

```bash
pytest -v tests/test_api.py::test_health_check
```

## Test Coverage

To run tests with coverage:

```bash
pytest --cov=app tests/
```

To generate a coverage report:

```bash
pytest --cov=app --cov-report=html tests/
```

This will create an HTML coverage report in the `htmlcov` directory.

## Environment Setup

Tests use a separate test database configuration defined in `conftest.py`. By default, tests will use:

```
DATABASE_URL = postgresql://postgres:postgres@localhost:5432/test_db
```

You can override this by setting the `DATABASE_URL` environment variable before running tests.

## Mocks

Most tests use mocks to avoid dependency on external services:

- Database connections are mocked to avoid actual database queries
- External API calls are mocked
- File system operations are mocked

## Running in Docker

To run tests in a Docker container:

```bash
docker-compose run --rm app pytest
```

This ensures that tests run in the same environment as the application. 