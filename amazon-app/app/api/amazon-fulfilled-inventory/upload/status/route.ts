import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get the file ID from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json({ 
        success: false, 
        message: 'File ID is required' 
      }, { status: 400 });
    }
    
    // Query the database for the file status
    const result = await db.query(
      `SELECT 
         id, 
         original_name, 
         status, 
         processed_rows, 
         total_rows, 
         error_message,
         created_at,
         updated_at
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
    
    const fileData = result.rows[0];
    
    // Calculate processing percentage
    const processedPercentage = fileData.total_rows > 0 
      ? Math.round((fileData.processed_rows || 0) / fileData.total_rows * 100) 
      : 0;
    
    return NextResponse.json({
      success: true,
      fileId: fileData.id,
      fileName: fileData.original_name,
      status: fileData.status,
      processedRows: fileData.processed_rows || 0,
      totalRows: fileData.total_rows,
      errorMessage: fileData.error_message,
      percentage: processedPercentage,
      createdAt: fileData.created_at,
      updatedAt: fileData.updated_at
    });
  } catch (error) {
    console.error('Error checking file status:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Error checking file status: ${(error as Error).message}` 
    }, { status: 500 });
  }
} 