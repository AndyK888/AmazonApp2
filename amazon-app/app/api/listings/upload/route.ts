import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'papaparse';
import { db } from '@/lib/db';
import { Listing, ListingUploadResponse } from '@/types/listing';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from 'redis';

// Create Redis client
const getRedisClient = async () => {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
  });
  
  await client.connect();
  return client;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        message: 'No file uploaded' 
      }, { status: 400 });
    }

    // Check file extension
    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.txt') && !filename.endsWith('.csv')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid file format. Please upload a .txt or .csv file' 
      }, { status: 400 });
    }

    // Create a unique file ID
    const fileId = randomUUID();
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadsDir, `${fileId}-${filename}`);
    fs.writeFileSync(filePath, buffer);
    
    // Count approximate number of rows
    const fileText = await file.text();
    const lineCount = fileText.split('\n').length - 1; // subtract header row
    
    // Store file information in database
    await db.query(
      `INSERT INTO uploaded_files (
         id, original_name, file_path, file_size, mime_type, status, total_rows, 
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        fileId,
        file.name,
        filePath,
        buffer.length,
        file.type || 'text/plain',
        'pending',
        lineCount
      ]
    );
    
    // Queue task for background processing
    try {
      const redis = await getRedisClient();
      
      // Create a Celery-compatible task message
      const taskId = randomUUID();
      const task = {
        id: taskId,
        task: 'process_report',
        args: [filePath, fileId],
        kwargs: {}
      };
      
      // Add task to Celery queue
      await redis.lPush('celery', JSON.stringify(task));
      await redis.quit();
      
      return NextResponse.json({
        success: true,
        message: 'File uploaded and queued for processing',
        fileId: fileId,
        status: 'pending'
      });
    } catch (redisError) {
      console.error('Error queueing task:', redisError);
      
      // Update file status to error
      await db.query(
        `UPDATE uploaded_files 
         SET status = 'error', error_message = $1, updated_at = NOW() 
         WHERE id = $2`,
        [`Failed to queue processing task: ${(redisError as Error).message}`, fileId]
      );
      
      return NextResponse.json({ 
        success: false, 
        message: `Error queueing processing task: ${(redisError as Error).message}`,
        fileId: fileId
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Error processing file: ${(error as Error).message}` 
    }, { status: 500 });
  }
} 