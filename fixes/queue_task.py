import redis
import json
import uuid
import os
import sys

# Create Redis client
def get_redis_client():
    redis_url = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
    print(f"Connecting to Redis at: {redis_url}")
    return redis.Redis.from_url(redis_url)

def queue_file_for_processing():
    try:
        # Use command line argument for file_id and file_name if provided, otherwise use default
        file_id = sys.argv[1] if len(sys.argv) > 1 else str(uuid.uuid4())
        file_name = sys.argv[2] if len(sys.argv) > 2 else "959815f4-db9f-4adc-9fb4-9433e4e1fffc-all+listings+report.txt"
        
        file_path = os.path.join("/app/uploads", file_name)
        
        print(f"Queueing task for file: {file_path}")
        print(f"Using file ID: {file_id}")
        
        redis_client = get_redis_client()
        
        # Create a Celery-compatible task message
        task_id = str(uuid.uuid4())
        task = {
            "id": task_id,
            "task": "process_all_listings_report",
            "args": [file_path, file_id],
            "kwargs": {},
            "exchange": "celery",
            "routing_key": "celery",
            "properties": {
                "delivery_mode": 2,  # persistent
                "correlation_id": task_id,
                "delivery_tag": task_id
            }
        }
        
        # Add task to Celery queue
        redis_client.lpush("celery", json.dumps(task))
        print("Task successfully added to Redis queue")
        print("Task ID:", task_id)
        
    except Exception as e:
        print(f"Error queueing task: {e}")

if __name__ == "__main__":
    queue_file_for_processing() 