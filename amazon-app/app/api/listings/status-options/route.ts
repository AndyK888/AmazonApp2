import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Query to get distinct status values
    const query = `
      SELECT DISTINCT "status" 
      FROM listings 
      WHERE "status" IS NOT NULL 
      ORDER BY "status"
    `;
    
    const result = await db.query(query);
    
    // Extract values from the result rows
    const statusOptions = result.rows.map(row => row['status']);
    
    return NextResponse.json(statusOptions);
  } catch (error) {
    console.error('Error fetching status options:', error);
    return NextResponse.json(
      { error: `Failed to fetch status options: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 