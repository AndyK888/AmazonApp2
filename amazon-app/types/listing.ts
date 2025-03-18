export interface Listing {
  id: number;
  item_name: string;
  item_description: string | null;
  listing_id: string | null;
  seller_sku: string;
  price: number | null;
  quantity: number;
  open_date: string | null;
  image_url: string | null;
  item_is_marketplace: boolean | null;
  product_id_type: string | null;
  zshop_shipping_fee: string | null;
  item_note: string | null;
  item_condition: string | null;
  zshop_category1: string | null;
  zshop_browse_path: string | null;
  zshop_storefront_feature: string | null;
  asin1: string | null;
  asin2: string | null;
  asin3: string | null;
  will_ship_internationally: boolean | null;
  expedited_shipping: boolean | null;
  zshop_boldface: boolean | null;
  product_id: string | null;
  bid_for_featured_placement: string | null;
  add_delete: string | null;
  pending_quantity: number | null;
  fulfillment_channel: string | null;
  merchant_shipping_group: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingUploadResponse {
  success: boolean;
  message: string;
  count?: number;
  errors?: string[];
} 