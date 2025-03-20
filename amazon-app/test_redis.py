import redis
import json
import uuid

# Connect to Redis
redis_client = redis.Redis.from_url('redis://redis:6379/0')
print('Connected to Redis')

# Create a task
task = {
    'id': str(uuid.uuid4()),
    'task': 'process_all_listings_report',
    'args': ['/app/uploads/959815f4-db9f-4adc-9fb4-9433e4e1fffc-all+listings+report.txt', str(uuid.uuid4())],
    'kwargs': {}
}

# Push to queue
redis_client.lpush('celery', json.dumps(task))
print('Task added to queue')
print(f'Task ID: {task["id"]}')
print(f'File path: {task["args"][0]}')
print(f'File ID: {task["args"][1]}')
print('Monitor worker logs to see processing status') 