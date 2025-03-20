# syntax=docker/dockerfile:1.4
# Base image
FROM python:3.11-slim AS deps

# Set working directory
WORKDIR /app

# Install dependencies with cache mount
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy dependencies from deps
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy only necessary worker code
COPY *.py ./
COPY *.json ./

# Create directory for uploads if it doesn't exist
RUN mkdir -p /app/uploads

# Run the worker
CMD ["python", "standalone_worker.py"] 