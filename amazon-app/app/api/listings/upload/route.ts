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
      delimiter: '\t',
      transformHeader: (header) => {
        // Keep headers as they are with hyphens, to match our database columns
        return header.trim();
      },
      transform: (value, field) => {
        // Trim whitespace and handle empty strings
        if (value === undefined || value === '') {
          return null;
        }
        
        const trimmedValue = typeof value === 'string' ? value.trim() : value;
        
        // Convert string values to appropriate types
        if (field === 'price') {
          return trimmedValue ? parseFloat(trimmedValue) : null;
        }
        if (field === 'quantity' || field === 'pending-quantity') {
          return trimmedValue ? parseInt(trimmedValue, 10) : 0;
        }
        if (field === 'item-is-marketplace' || field === 'will-ship-internationally' || 
            field === 'expedited-shipping' || field === 'zshop-boldface') {
          if (trimmedValue === 'y' || trimmedValue === 'yes' || trimmedValue === 'true' || trimmedValue === 'Y') {
            return true;
          }
          if (trimmedValue === 'n' || trimmedValue === 'no' || trimmedValue === 'false' || trimmedValue === 'N') {
            return false;
          }
          return null;
        }
        return trimmedValue;
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
          if (!listing['seller-sku']) {
            errors.push(`Row ${index + 1}: Missing seller SKU`);
            return;
          }

          // Check if record exists
          const existingListing = await db.query(
            'SELECT id FROM listings WHERE "seller-sku" = $1',
            [listing['seller-sku']]
          );

          if (existingListing.rows.length > 0) {
            // Update existing record
            const id = existingListing.rows[0].id;
            const keys = Object.keys(listing);
            
            // Only include fields that have values
            const fieldsToUpdate = keys.filter(key => listing[key] !== undefined && listing[key] !== null);
            
            if (fieldsToUpdate.length > 0) {
              const setClause = fieldsToUpdate
                .map((key, i) => `"${key}" = $${i + 2}`)
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
            
            const quotedKeys = keys.map(key => `"${key}"`).join(', ');
            
            await db.query(
              `INSERT INTO listings (${quotedKeys}) VALUES (${placeholders})`,
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