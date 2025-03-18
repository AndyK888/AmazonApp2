import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Listing } from '@/types/listing';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const search = searchParams.get('search') || '';
    const fulfillmentChannel = searchParams.get('fulfillmentChannel') || '';
    const status = searchParams.get('status') || '';
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build the WHERE clause for filtering and searching
    let whereClause = '';
    const queryParams: any[] = [];
    let paramCount = 1;
    
    // Add status filter if provided
    if (status) {
      whereClause = `WHERE "status" = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }
    
    // Add fulfillment channel filter if provided
    if (fulfillmentChannel) {
      if (whereClause) {
        whereClause += ` AND "fulfillment-channel" = $${paramCount}`;
      } else {
        whereClause = `WHERE "fulfillment-channel" = $${paramCount}`;
      }
      queryParams.push(fulfillmentChannel);
      paramCount++;
    }
    
    // Add search query if provided (search across SKU, Product ID, and ASIN)
    if (search) {
      const searchTerm = `%${search}%`;
      if (whereClause) {
        whereClause += ` AND ("seller-sku" ILIKE $${paramCount} OR "product-id" ILIKE $${paramCount} OR "asin1" ILIKE $${paramCount})`;
      } else {
        whereClause = `WHERE ("seller-sku" ILIKE $${paramCount} OR "product-id" ILIKE $${paramCount} OR "asin1" ILIKE $${paramCount})`;
      }
      queryParams.push(searchTerm);
      paramCount++;
    }
    
    // Count total records for pagination
    const countQuery = `SELECT COUNT(*) FROM listings ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    // Count total active listings (regardless of filters)
    const activeCountQuery = `SELECT COUNT(*) FROM listings WHERE "status" = 'Active'`;
    const activeCountResult = await db.query(activeCountQuery);
    const totalActiveCount = parseInt(activeCountResult.rows[0].count, 10);
    
    // Query the listings with filters, search, and pagination
    const query = `
      SELECT * FROM listings 
      ${whereClause} 
      ORDER BY updated_at DESC 
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await db.query(query, queryParams);
    
    // Return data with pagination metadata
    return NextResponse.json({
      listings: result.rows,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        pageSize: limit
      },
      totalActiveCount
    });
    
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: `Failed to fetch listings: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 