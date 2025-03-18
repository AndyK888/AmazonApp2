export interface Listing {
  id: number;
  "item-name": string;
  "item-description": string | null;
  "listing-id": string | null;
  "seller-sku": string;
  "price": number | null;
  "quantity": number;
  "open-date": string | null;
  "image-url": string | null;
  "item-is-marketplace": boolean | null;
  "product-id-type": string | null;
  "zshop-shipping-fee": string | null;
  "item-note": string | null;
  "item-condition": string | null;
  "zshop-category1": string | null;
  "zshop-browse-path": string | null;
  "zshop-storefront-feature": string | null;
  "asin1": string | null;
  "asin2": string | null;
  "asin3": string | null;
  "will-ship-internationally": boolean | null;
  "expedited-shipping": boolean | null;
  "zshop-boldface": boolean | null;
  "product-id": string | null;
  "bid-for-featured-placement": string | null;
  "add-delete": string | null;
  "pending-quantity": number | null;
  "fulfillment-channel": string | null;
  "merchant-shipping-group": string | null;
  "status": string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingUploadResponse {
  success: boolean;
  message: string;
  count?: number;
  errors?: string[];
} 