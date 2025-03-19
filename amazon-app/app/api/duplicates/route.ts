import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Define types for our data structures
type DuplicateItem = {
  id: number;
  product_id: number | null;
  item_name: string;
  data: Record<string, any>;
};

type DuplicateIssue = {
  id: number;
  file_id: string;
  created_at: string;
  status: string;
  duplicate_info: Record<string, any>;
  resolution_strategy?: Record<string, any>;
  resolved_at?: string;
};

// GET endpoint to retrieve duplicate SKU issues
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const issueId = searchParams.get('id');
    
    // If an ID is provided, return that specific issue
    if (issueId) {
      const result = await db.query(
        `SELECT 
          id,
          file_id,
          created_at,
          status,
          duplicate_info,
          resolution_strategy,
          resolved_at
        FROM duplicate_sku_issues
        WHERE id = $1`,
        [parseInt(issueId)]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Issue not found' 
        }, { status: 404 });
      }
      
      const issue = result.rows[0];
      
      return NextResponse.json({
        success: true,
        issue: {
          id: issue.id,
          file_id: issue.file_id,
          created_at: issue.created_at,
          status: issue.status,
          duplicate_info: issue.duplicate_info,
          resolution_strategy: issue.resolution_strategy,
          resolved_at: issue.resolved_at
        }
      });
    }
    
    // Otherwise, return a list of issues based on status
    const result = await db.query(
      `SELECT 
        id,
        file_id,
        created_at,
        status,
        duplicate_info
      FROM duplicate_sku_issues
      WHERE status = $1
      ORDER BY created_at DESC`,
      [status]
    );
    
    // Get file names for each issue
    const fileIds = result.rows
      .map(row => row.file_id)
      .filter(Boolean);
    
    let fileNames: Record<string, string> = {};
    
    if (fileIds.length > 0) {
      const placeholders = fileIds.map((_, i) => `$${i + 1}`).join(',');
      const filesResult = await db.query(
        `SELECT id, original_name 
         FROM uploaded_files 
         WHERE id IN (${placeholders})`,
        fileIds
      );
      
      fileNames = Object.fromEntries(
        filesResult.rows.map(row => [row.id, row.original_name])
      );
    }
    
    return NextResponse.json({
      success: true,
      issues: result.rows.map(row => ({
        ...row,
        filename: fileNames[row.file_id] || 'Unknown file',
        duplicatesCount: Object.keys(row.duplicate_info || {}).length
      }))
    });
    
  } catch (error) {
    console.error('Error fetching duplicate issues:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch duplicate issues'
    }, { status: 500 });
  }
}

// POST endpoint to resolve duplicate SKU issues
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { issueId, resolutions } = data;
    
    if (!issueId || !resolutions || !Array.isArray(resolutions)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid request data'
      }, { status: 400 });
    }
    
    // Verify the issue exists and is not resolved
    const result = await db.query(
      `SELECT id, status
       FROM duplicate_sku_issues
       WHERE id = $1`,
      [issueId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Issue not found'
      }, { status: 404 });
    }
    
    const issue = result.rows[0];
    
    if (issue.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        message: 'Issue has already been resolved'
      }, { status: 400 });
    }
    
    // Start a transaction
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update the issue status
      await client.query(
        `UPDATE duplicate_sku_issues
         SET status = 'resolved', 
             resolved_at = NOW(),
             resolution_strategy = $1
         WHERE id = $2`,
        [JSON.stringify(resolutions), issueId]
      );
      
      // Process each resolution
      for (const resolution of resolutions) {
        const { sku, resolutionType, selectedId } = resolution;
        
        // Here we would implement the logic to update the listings table
        // based on the resolution type and selected SKUs
        // This part depends on how your duplicate resolution works in your system
        
        // For now, just log the resolution
        console.log(`Resolving SKU ${sku} with method ${resolutionType}, selected ID: ${selectedId}`);
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: 'Duplicate issue resolved successfully'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error resolving duplicate issue:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Failed to resolve duplicate issue: ${(error as Error).message}`
    }, { status: 500 });
  }
} 