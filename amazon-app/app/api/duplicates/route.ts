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
  file_id: number;
  created_at: string;
  updated_at: string;
  status: string;
  notes: string | null;
  duplicate_items: Record<string, DuplicateItem[]>;
};

// GET endpoint to retrieve duplicate SKU issues
export async function GET(request: NextRequest) {
  try {
    // For testing, we'll use a default user ID
    const userId = 1;
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const issueId = searchParams.get('id');
    
    // If an ID is provided, return that specific issue
    if (issueId) {
      const result = await db.query(
        `SELECT 
          di.id,
          di.file_id,
          di.created_at,
          di.updated_at,
          di.status,
          di.notes,
          di.user_id,
          dit.id as item_id,
          dit.sku,
          dit.product_id,
          dit.item_name,
          dit.data
        FROM duplicate_issues di
        LEFT JOIN duplicate_items dit ON di.id = dit.issue_id
        WHERE di.id = $1 AND di.user_id = $2`,
        [parseInt(issueId), userId]
      );
      
      if (result.rows.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Issue not found' 
        }, { status: 404 });
      }
      
      // Group the items by duplicate SKU
      const issue: DuplicateIssue = {
        id: result.rows[0].id,
        file_id: result.rows[0].file_id,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        status: result.rows[0].status,
        notes: result.rows[0].notes,
        duplicate_items: {}
      };
      
      // Group by SKU
      result.rows.forEach(row => {
        const sku = row.sku as string;
        
        if (!issue.duplicate_items[sku]) {
          issue.duplicate_items[sku] = [];
        }
        
        issue.duplicate_items[sku].push({
          id: row.item_id,
          product_id: row.product_id,
          item_name: row.item_name,
          data: JSON.parse(row.data || '{}')
        });
      });
      
      return NextResponse.json({
        success: true,
        issue
      });
    }
    
    // Otherwise, return a list of issues based on status
    const result = await db.query(
      `SELECT 
        di.id,
        di.file_id,
        di.created_at,
        di.status,
        COUNT(dit.id) as item_count
      FROM duplicate_issues di
      LEFT JOIN duplicate_items dit ON di.id = dit.issue_id
      WHERE di.user_id = $1 AND di.status = $2
      GROUP BY di.id
      ORDER BY di.created_at DESC`,
      [userId, status]
    );
    
    // Get file names for each issue
    const fileIds = result.rows
      .map(row => row.file_id)
      .filter(Boolean);
    
    let fileNames: Record<string, string> = {};
    
    if (fileIds.length > 0) {
      const filesResult = await db.query(
        `SELECT id, original_filename 
         FROM uploads 
         WHERE id IN (${fileIds.join(',')})`,
        []
      );
      
      fileNames = Object.fromEntries(
        filesResult.rows.map(row => [row.id, row.original_filename])
      );
    }
    
    return NextResponse.json({
      success: true,
      issues: result.rows.map(row => ({
        ...row,
        filename: fileNames[row.file_id] || 'Unknown file'
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
    // For testing, we'll use a default user ID
    const userId = 1;
    
    const data = await request.json();
    const { issueId, resolutions, notes } = data;
    
    if (!issueId || !resolutions || !Array.isArray(resolutions)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid request data'
      }, { status: 400 });
    }
    
    // Verify the issue belongs to the user
    const result = await db.query(
      `SELECT id, status
       FROM duplicate_issues
       WHERE id = $1 AND user_id = $2`,
      [issueId, userId]
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
        `UPDATE duplicate_issues
         SET status = 'resolved', 
             updated_at = NOW(),
             notes = $1
         WHERE id = $2`,
        [notes || null, issueId]
      );
      
      // Process each resolution
      for (const resolution of resolutions) {
        const { sku, resolutionType, selectedId, mergedFields, newSku } = resolution;
        
        switch (resolutionType) {
          case 'keep_newest':
          case 'keep_one': {
            // Get all items with this SKU
            const itemsResult = await client.query(
              `SELECT id, product_id
               FROM duplicate_items
               WHERE issue_id = $1 AND sku = $2`,
              [issueId, sku]
            );
            
            const items = itemsResult.rows;
            
            // Item to keep
            const keepItem = items.find(item => item.id === selectedId);
            
            if (!keepItem) {
              throw new Error(`Selected item ${selectedId} not found for SKU ${sku}`);
            }
            
            // Delete items not selected
            await client.query(
              `DELETE FROM duplicate_items
               WHERE issue_id = $1 AND sku = $2 AND id != $3`,
              [issueId, sku, selectedId]
            );
            
            break;
          }
          
          case 'merge': {
            if (!mergedFields || Object.keys(mergedFields).length === 0) {
              throw new Error(`No merge fields provided for SKU ${sku}`);
            }
            
            // Get all items with this SKU
            const itemsResult = await client.query(
              `SELECT id, product_id, data
               FROM duplicate_items
               WHERE issue_id = $1 AND sku = $2`,
              [issueId, sku]
            );
            
            const items = itemsResult.rows;
            
            // Create merged data
            const mergedData: Record<string, any> = {};
            
            // Apply selected fields from each item
            for (const field in mergedFields) {
              const sourceItemId = mergedFields[field];
              const sourceItem = items.find(item => item.id === sourceItemId);
              
              if (sourceItem) {
                const itemData = JSON.parse(sourceItem.data || '{}') as Record<string, any>;
                mergedData[field] = itemData[field];
              }
            }
            
            // Keep the first item and update it with merged data
            const keepItemId = items[0].id;
            const keepItemData = JSON.parse(items[0].data || '{}') as Record<string, any>;
            
            await client.query(
              `UPDATE duplicate_items
               SET data = $1
               WHERE id = $2`,
              [JSON.stringify({
                ...keepItemData,
                ...mergedData
              }), keepItemId]
            );
            
            // Delete other items
            await client.query(
              `DELETE FROM duplicate_items
               WHERE issue_id = $1 AND sku = $2 AND id != $3`,
              [issueId, sku, keepItemId]
            );
            
            break;
          }
          
          case 'rename': {
            if (!newSku) {
              throw new Error(`No new SKU provided for rename operation on ${sku}`);
            }
            
            // Get the item to rename
            const itemResult = await client.query(
              `SELECT id, product_id
               FROM duplicate_items
               WHERE issue_id = $1 AND sku = $2 AND id = $3`,
              [issueId, sku, selectedId]
            );
            
            if (itemResult.rows.length === 0) {
              throw new Error(`Selected item ${selectedId} not found for SKU ${sku}`);
            }
            
            // Update the SKU
            await client.query(
              `UPDATE duplicate_items
               SET sku = $1
               WHERE id = $2`,
              [newSku, selectedId]
            );
            
            break;
          }
          
          default:
            throw new Error(`Unknown resolution type: ${resolutionType}`);
        }
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