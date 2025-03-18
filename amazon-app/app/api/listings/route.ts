import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Listing } from '@/types/listing';

export async function GET() {
  try {
    const result = await db.query('SELECT * FROM listings ORDER BY updated_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: `Failed to fetch listings: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 