/**
 * Example integration with the All Listing Report Service API
 * 
 * This file demonstrates how to integrate the All Listing Report Service
 * with the main application using JavaScript/TypeScript.
 */

// Configuration
const ALL_LISTING_API_URL = 'http://all-listing-service:5000';

/**
 * Get product identifiers by SKU
 * 
 * @param {string} sku - The seller SKU to look up
 * @param {Object} options - Options for the request
 * @param {boolean} options.includeAsin - Whether to include ASIN in the response (default: true)
 * @param {boolean} options.includeProductId - Whether to include product ID in the response (default: true)
 * @returns {Promise<Object>} - Product information
 */
async function getProductBySku(sku, options = { includeAsin: true, includeProductId: true }) {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (options.includeAsin !== undefined) {
      params.append('include_asin', options.includeAsin);
    }
    if (options.includeProductId !== undefined) {
      params.append('include_product_id', options.includeProductId);
    }
    
    // Make the API request
    const response = await fetch(`${ALL_LISTING_API_URL}/api/products/${sku}?${params.toString()}`);
    
    // Handle errors
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Product not found
      }
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Return the product information
    return await response.json();
  } catch (error) {
    console.error(`Error fetching product ${sku}:`, error);
    throw error;
  }
}

/**
 * Get multiple products by SKUs in a single request
 * 
 * @param {string[]} skus - List of SKUs to look up
 * @param {Object} options - Options for the request
 * @param {boolean} options.includeAsin - Whether to include ASIN in the response (default: true)
 * @param {boolean} options.includeProductId - Whether to include product ID in the response (default: true)
 * @returns {Promise<Object>} - Map of SKUs to product information
 */
async function batchGetProducts(skus, options = { includeAsin: true, includeProductId: true }) {
  try {
    if (!skus || skus.length === 0) {
      return {};
    }
    
    // Build query parameters
    const params = new URLSearchParams();
    if (options.includeAsin !== undefined) {
      params.append('include_asin', options.includeAsin);
    }
    if (options.includeProductId !== undefined) {
      params.append('include_product_id', options.includeProductId);
    }
    
    // Make the API request
    const response = await fetch(`${ALL_LISTING_API_URL}/api/products/batch?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skus }),
    });
    
    // Handle errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Return the product information
    return await response.json();
  } catch (error) {
    console.error(`Error fetching products in batch:`, error);
    throw error;
  }
}

/**
 * Process an All Listing Report file
 * 
 * @param {string} filePath - Path to the report file
 * @returns {Promise<Object>} - Processing result
 */
async function processReport(filePath) {
  try {
    // Make the API request
    const response = await fetch(`${ALL_LISTING_API_URL}/api/reports/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_path: filePath }),
    });
    
    // Handle errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Return the processing result
    return await response.json();
  } catch (error) {
    console.error(`Error processing report:`, error);
    throw error;
  }
}

// Example usage
async function exampleUsage() {
  try {
    // Get product by SKU
    const product = await getProductBySku('AM-1000-BK-4W-A1');
    console.log('Product:', product);
    
    // Get multiple products in a batch
    const products = await batchGetProducts(['AM-1000-BK-4W-A1', 'AM-1000-BL-4W-A3']);
    console.log('Batch products:', products);
    
    // Process a report file
    const result = await processReport('/path/to/report.txt');
    console.log('Processing result:', result);
  } catch (error) {
    console.error('Example usage error:', error);
  }
}

// Export the functions for use in the main application
module.exports = {
  getProductBySku,
  batchGetProducts,
  processReport,
}; 