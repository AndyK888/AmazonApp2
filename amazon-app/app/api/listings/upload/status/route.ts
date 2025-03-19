import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ 
        success: false, 
        message: 'File ID is required' 
      }, { status: 400 });
    }

    // Get file processing status
    const result = await db.query(
      `SELECT 
        id, 
        original_name, 
        status, 
        processed_rows, 
        total_rows, 
        error_message,
        created_at,
        updated_at,
        completed_at,
        CASE 
          WHEN total_rows > 0 THEN 
            ROUND((processed_rows::numeric / total_rows) * 100, 1)
          ELSE 0 
        END as progress_percentage
      FROM uploaded_files 
      WHERE id = $1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'File not found' 
      }, { status: 404 });
    }

    const fileStatus = result.rows[0];
    
    // Get the count of listings from this file
    const listingsResult = await db.query(
      'SELECT COUNT(*) as count FROM listings WHERE file_id = $1',
      [fileId]
    );
    
    const listingsCount = parseInt(listingsResult.rows[0]?.count || '0');

    return NextResponse.json({
      success: true,
      fileId: fileStatus.id,
      fileName: fileStatus.original_name,
      status: fileStatus.status,
      processedRows: fileStatus.processed_rows,
      totalRows: fileStatus.total_rows,
      progress: Number(fileStatus.progress_percentage),
      listingsCount: listingsCount,
      errorMessage: fileStatus.error_message,
      createdAt: fileStatus.created_at,
      updatedAt: fileStatus.updated_at,
      completedAt: fileStatus.completed_at
    });
  } catch (error) {
    console.error('Error getting file status:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Error getting file status: ${(error as Error).message}` 
    }, { status: 500 });
  }
} 