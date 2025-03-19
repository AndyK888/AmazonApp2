import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET handler for retrieving identifier changes
export async function GET(request: NextRequest) {
  try {
    // For testing, we'll use a default user ID
    const userId = 1;
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const acknowledged = searchParams.get('acknowledged');
    const sellerSku = searchParams.get('sellerSku');
    const fileId = searchParams.get('fileId');
    
    // Build the base query
    let queryParams: any[] = [userId];
    let paramIndex = 1;
    
    let queryString = `
      SELECT 
        ic.id,
        ic.product_id,
        ic.file_id,
        ic.identifier_type,
        ic.old_value,
        ic.new_value,
        ic.change_type,
        ic.reported_at,
        ic.acknowledged_at,
        p.seller_sku,
        p.item_name
      FROM identifier_changes ic
      LEFT JOIN products p ON p.id = ic.product_id
      WHERE ic.user_id = $${paramIndex++}
    `;
    
    // Apply filters
    if (acknowledged !== null && acknowledged !== undefined) {
      if (acknowledged === 'true') {
        queryString += ` AND ic.acknowledged_at IS NOT NULL`;
      } else if (acknowledged === 'false') {
        queryString += ` AND ic.acknowledged_at IS NULL`;
      }
    }
    
    if (sellerSku) {
      queryString += ` AND p.seller_sku = $${paramIndex++}`;
      queryParams.push(sellerSku);
    }
    
    if (fileId) {
      queryString += ` AND ic.file_id = $${paramIndex++}`;
      queryParams.push(parseInt(fileId));
    }
    
    // Count query
    const countQueryString = `
      SELECT COUNT(ic.id) as count
      FROM identifier_changes ic
      LEFT JOIN products p ON p.id = ic.product_id
      WHERE ic.user_id = $1
      ${acknowledged !== null && acknowledged !== undefined 
        ? acknowledged === 'true' 
          ? ' AND ic.acknowledged_at IS NOT NULL' 
          : ' AND ic.acknowledged_at IS NULL' 
        : ''}
      ${sellerSku ? ` AND p.seller_sku = $${sellerSku ? 2 : 0}` : ''}
      ${fileId ? ` AND ic.file_id = $${fileId ? (sellerSku ? 3 : 2) : 0}` : ''}
    `;
    
    const countResult = await db.query(countQueryString, queryParams);
    const totalCount = parseInt(countResult.rows[0]?.count || '0');
    
    // Final query with pagination
    queryString += ` ORDER BY ic.reported_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    const result = await db.query(queryString, queryParams);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      success: true,
      changes: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit
      }
    });
    
  } catch (error) {
    console.error('Error fetching identifier changes:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch identifier changes'
    }, { status: 500 });
  }
}

// POST handler for acknowledging changes
export async function POST(request: NextRequest) {
  try {
    // For testing, we'll use a default user ID
    const userId = 1;
    
    const { changeIds } = await request.json();
    
    if (!changeIds || !Array.isArray(changeIds) || changeIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No change IDs provided' 
      }, { status: 400 });
    }
    
    // Verify all changes belong to this user
    const verifyQuery = `
      SELECT id 
      FROM identifier_changes 
      WHERE id = ANY($1::int[]) 
      AND user_id = $2
    `;
    
    const verifyResult = await db.query(verifyQuery, [changeIds, userId]);
    
    if (verifyResult.rows.length !== changeIds.length) {
      return NextResponse.json({ 
        success: false, 
        message: 'One or more change IDs are invalid or don\'t belong to you' 
      }, { status: 403 });
    }
    
    // Update the changes to mark them as acknowledged
    const updateQuery = `
      UPDATE identifier_changes
      SET acknowledged_at = NOW()
      WHERE id = ANY($1::int[])
      AND user_id = $2
    `;
    
    await db.query(updateQuery, [changeIds, userId]);
    
    return NextResponse.json({
      success: true,
      message: `${changeIds.length} changes acknowledged successfully`
    });
    
  } catch (error) {
    console.error('Error acknowledging changes:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to acknowledge changes'
    }, { status: 500 });
  }
} 