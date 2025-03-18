import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Query to get distinct fulfillment channels
    const query = `
      SELECT DISTINCT "fulfillment-channel" 
      FROM listings 
      WHERE "fulfillment-channel" IS NOT NULL 
      ORDER BY "fulfillment-channel"
    `;
    
    const result = await db.query(query);
    
    // Extract values from the result rows
    const fulfillmentChannels = result.rows.map(row => row['fulfillment-channel']);
    
    return NextResponse.json(fulfillmentChannels);
  } catch (error) {
    console.error('Error fetching fulfillment channels:', error);
    return NextResponse.json(
      { error: `Failed to fetch fulfillment channels: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 