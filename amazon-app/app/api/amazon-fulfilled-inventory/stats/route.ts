import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { InventoryStatistics } from '@/types/inventory';

const AMAZON_FULFILLED_INVENTORY_API_URL = process.env.AMAZON_FULFILLED_INVENTORY_API_URL || 'http://amazon-fulfilled-inventory-service:5000';

export async function GET(request: NextRequest) {
  try {
    // Call the Amazon Fulfilled Inventory microservice to get statistics
    const apiUrl = `${AMAZON_FULFILLED_INVENTORY_API_URL}/api/inventory/stats`;
    const response = await axios.get(apiUrl);
    
    // Extract statistics from response
    const stats: InventoryStatistics = response.data || {
      total_skus: 0,
      total_fulfillable: 0,
      total_unfulfillable: 0,
      total_reserved: 0,
      total_quantity: 0,
      total_inbound_working: 0,
      total_inbound_shipped: 0,
      total_inbound_receiving: 0
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching inventory statistics from microservice:', error);
    
    // Return empty statistics with zeros if there's an error
    const emptyStats: InventoryStatistics = {
      total_skus: 0,
      total_fulfillable: 0,
      total_unfulfillable: 0,
      total_reserved: 0,
      total_quantity: 0,
      total_inbound_working: 0,
      total_inbound_shipped: 0,
      total_inbound_receiving: 0
    };
    
    return NextResponse.json(emptyStats);
  }
} 