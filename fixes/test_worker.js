const redis = require('redis');
const { randomUUID } = require('crypto');
const path = require('path');

// Create Redis client
const getRedisClient = async () => {
  const client = redis.createClient({
    url: 'redis://redis:6379'
  });
  
  await client.connect();
  return client;
};

async function queueFileForProcessing() {
  try {
    // Select an existing file from the uploads directory
    const fileId = process.argv[2] || randomUUID();
    const filePath = path.join('/app/uploads', process.argv[3] || '959815f4-db9f-4adc-9fb4-9433e4e1fffc-all+listings+report.txt');
    
    console.log(`Queueing task for file: ${filePath}`);
    console.log(`Using file ID: ${fileId}`);
    
    const redis = await getRedisClient();
    
    // Create a Celery-compatible task message
    const taskId = randomUUID();
    const task = {
      id: taskId,
      task: 'process_all_listings_report',
      args: [filePath, fileId],
      kwargs: {},
      exchange: 'celery',
      routing_key: 'celery',
      properties: {
        delivery_mode: 2,  // persistent
        correlation_id: taskId,
        delivery_tag: taskId
      }
    };
    
    // Add task to Celery queue
    await redis.lPush('celery', JSON.stringify(task));
    console.log('Task successfully added to Redis queue');
    console.log('Task ID:', taskId);
    
    await redis.quit();
  } catch (error) {
    console.error('Error queueing task:', error);
  }
}

queueFileForProcessing(); 