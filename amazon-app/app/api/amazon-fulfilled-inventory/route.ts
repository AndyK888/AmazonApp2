import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { InventoryResponse, InventoryItem, PaginationData } from '@/types/inventory';

const AMAZON_FULFILLED_INVENTORY_API_URL = process.env.AMAZON_FULFILLED_INVENTORY_API_URL || 'http://amazon-fulfilled-inventory-service:5000';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '100';
    const search = searchParams.get('search') || '';
    const condition = searchParams.get('condition') || '';
    
    // Build query parameters for the API
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    
    if (search) {
      params.append('search', search);
    }
    
    if (condition) {
      params.append('condition', condition);
    }
    
    // Call the Amazon Fulfilled Inventory microservice
    const apiUrl = `${AMAZON_FULFILLED_INVENTORY_API_URL}/api/inventory?${params.toString()}`;
    const response = await axios.get(apiUrl);
    
    // Extract data from response
    const items: InventoryItem[] = response.data.items || [];
    
    // Create pagination data
    const pagination: PaginationData = {
      totalCount: response.data.pagination?.totalCount || 0,
      totalPages: response.data.pagination?.totalPages || 0,
      currentPage: parseInt(page),
      pageSize: parseInt(limit)
    };
    
    // Prepare response
    const responseData: InventoryResponse = {
      items,
      pagination
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching inventory from microservice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory data from service' },
      { status: 500 }
    );
  }
} 