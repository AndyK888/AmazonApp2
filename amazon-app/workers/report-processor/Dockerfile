# Base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker code
COPY . .

# Create directory for uploads if it doesn't exist
RUN mkdir -p /app/uploads

# Run the worker
CMD ["python", "worker.py"] 