import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'papaparse';
import { db } from '@/lib/db';
import { Listing, ListingUploadResponse } from '@/types/listing';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        message: 'No file uploaded' 
      }, { status: 400 });
    }

    // Check file extension
    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.txt') && !filename.endsWith('.csv')) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid file format. Please upload a .txt or .csv file' 
      }, { status: 400 });
    }

    // Read the file
    const fileText = await file.text();
    
    // Parse the CSV/tab-delimited file
    const results = parse(fileText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Transform headers to match our database columns
        const headerMap: { [key: string]: string } = {
          'item-name': 'item_name',
          'item-description': 'item_description',
          'listing-id': 'listing_id',
          'seller-sku': 'seller_sku',
          'price': 'price',
          'quantity': 'quantity',
          'open-date': 'open_date',
          'image-url': 'image_url',
          'item-is-marketplace': 'item_is_marketplace',
          'product-id-type': 'product_id_type',
          'zshop-shipping-fee': 'zshop_shipping_fee',
          'item-note': 'item_note',
          'item-condition': 'item_condition',
          'zshop-category1': 'zshop_category1',
          'zshop-browse-path': 'zshop_browse_path',
          'zshop-storefront-feature': 'zshop_storefront_feature',
          'asin1': 'asin1',
          'asin2': 'asin2',
          'asin3': 'asin3',
          'will-ship-internationally': 'will_ship_internationally',
          'expedited-shipping': 'expedited_shipping',
          'zshop-boldface': 'zshop_boldface',
          'product-id': 'product_id',
          'bid-for-featured-placement': 'bid_for_featured_placement',
          'add-delete': 'add_delete',
          'pending-quantity': 'pending_quantity',
          'fulfillment-channel': 'fulfillment_channel',
          'merchant-shipping-group': 'merchant_shipping_group',
          'status': 'status'
        };
        return headerMap[header] || header.replace(/-/g, '_');
      },
      transform: (value, field) => {
        // Convert string values to appropriate types
        if (field === 'price') {
          return value ? parseFloat(value) : null;
        }
        if (field === 'quantity' || field === 'pending_quantity') {
          return value ? parseInt(value, 10) : 0;
        }
        if (field === 'item_is_marketplace' || field === 'will_ship_internationally' || 
            field === 'expedited_shipping' || field === 'zshop_boldface') {
          if (value === 'y' || value === 'yes' || value === 'true' || value === 'Y') {
            return true;
          }
          if (value === 'n' || value === 'no' || value === 'false' || value === 'N') {
            return false;
          }
          return null;
        }
        return value;
      }
    });

    if (results.errors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error parsing file',
        errors: results.errors.map(error => error.message)
      }, { status: 400 });
    }

    // Process the data
    const listings = results.data as any[];
    const errors: string[] = [];
    let processedCount = 0;

    // Batch process listings
    await Promise.all(
      listings.map(async (listing, index) => {
        try {
          if (!listing.seller_sku) {
            errors.push(`Row ${index + 1}: Missing seller SKU`);
            return;
          }

          // Check if record exists
          const existingListing = await db.query(
            'SELECT id FROM listings WHERE seller_sku = $1',
            [listing.seller_sku]
          );

          if (existingListing.rows.length > 0) {
            // Update existing record
            const id = existingListing.rows[0].id;
            const keys = Object.keys(listing);
            
            // Only include fields that have values
            const fieldsToUpdate = keys.filter(key => listing[key] !== undefined && listing[key] !== null);
            
            if (fieldsToUpdate.length > 0) {
              const setClause = fieldsToUpdate
                .map((key, i) => `${key} = $${i + 2}`)
                .join(', ');
              
              const values = fieldsToUpdate.map(key => listing[key]);
              
              await db.query(
                `UPDATE listings SET ${setClause} WHERE id = $1`,
                [id, ...values]
              );
            }
          } else {
            // Insert new record
            const keys = Object.keys(listing).filter(key => listing[key] !== undefined);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const values = keys.map(key => listing[key]);
            
            await db.query(
              `INSERT INTO listings (${keys.join(', ')}) VALUES (${placeholders})`,
              values
            );
          }
          
          processedCount++;
        } catch (error) {
          errors.push(`Row ${index + 1}: ${(error as Error).message}`);
        }
      })
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedCount} listings`,
      count: processedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Error processing file: ${(error as Error).message}` 
    }, { status: 500 });
  }
} 