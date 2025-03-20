import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const AMAZON_FULFILLED_INVENTORY_API_URL = process.env.AMAZON_FULFILLED_INVENTORY_API_URL || 'http://amazon-fulfilled-inventory-service:5000';

export async function GET(request: NextRequest) {
  try {
    // Call the Amazon Fulfilled Inventory microservice to get conditions
    const apiUrl = `${AMAZON_FULFILLED_INVENTORY_API_URL}/api/inventory/conditions`;
    const response = await axios.get(apiUrl);
    
    // Extract conditions from response
    const conditions: string[] = response.data || [];
    
    return NextResponse.json(conditions);
  } catch (error) {
    console.error('Error fetching conditions from microservice:', error);
    return NextResponse.json(
      [],
      { status: 500 }
    );
  }
} 