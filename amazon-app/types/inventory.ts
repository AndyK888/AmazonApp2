export interface InventoryItem {
  id?: number;
  sku: string;
  asin?: string;
  fnsku?: string;
  product_name?: string;
  condition?: string;
  quantity?: number;
  fulfillable_quantity?: number;
  unfulfillable_quantity?: number;
  reserved_quantity?: number;
  inbound_working_quantity?: number;
  inbound_shipped_quantity?: number;
  inbound_receiving_quantity?: number;
  updated_at?: string;
}

export interface InventoryStatistics {
  total_skus: number;
  total_fulfillable: number;
  total_unfulfillable: number;
  total_reserved: number;
  total_quantity: number;
  total_inbound_working: number;
  total_inbound_shipped: number;
  total_inbound_receiving: number;
}

export interface PaginationData {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface InventoryResponse {
  items: InventoryItem[];
  pagination: PaginationData;
}

export interface ReportUploadResponse {
  success: boolean;
  message: string;
  fileId?: string;
  status?: string;
}

export interface ReportRequest {
  report_path: string;
}

export interface InventoryRequest {
  skus: string[];
} 