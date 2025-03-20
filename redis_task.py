import redis
import json

# Connect to Redis
redis_client = redis.Redis.from_url("redis://redis:6379/0")

# Create a sample task to process the file
task = {
    "id": "manual-task-1",
    "task": "process_all_listings_report",
    "args": ["/app/uploads/959815f4-db9f-4adc-9fb4-9433e4e1fffc-all+listings+report.txt", "959815f4-db9f-4adc-9fb4-9433e4e1fffc"],
    "kwargs": {}
}

# Push the task to the Redis queue
redis_client.rpush("celery", json.dumps(task))

print("Task added to Redis queue") 