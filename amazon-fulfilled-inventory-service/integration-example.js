/**
 * Example integration with the Amazon-fulfilled Inventory Service API
 * 
 * This file demonstrates how to integrate the Amazon-fulfilled Inventory Service
 * with the main application using JavaScript/TypeScript.
 */

// Configuration
const FBA_INVENTORY_API_URL = 'http://fba-inventory-service:5000';

/**
 * Get inventory information by SKU
 * 
 * @param {string} sku - The seller SKU to look up
 * @returns {Promise<Object>} - Inventory information
 */
async function getInventoryBySku(sku) {
  try {
    // Make the API request
    const response = await fetch(`${FBA_INVENTORY_API_URL}/api/inventory/${sku}`);
    
    // Handle errors
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Inventory not found
      }
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Return the inventory information
    return await response.json();
  } catch (error) {
    console.error(`Error fetching inventory for SKU ${sku}:`, error);
    throw error;
  }
}

/**
 * Get inventory information for multiple SKUs in a single request
 * 
 * @param {string[]} skus - List of SKUs to look up
 * @returns {Promise<Object>} - Map of SKUs to inventory information
 */
async function batchGetInventory(skus) {
  try {
    if (!skus || skus.length === 0) {
      return {};
    }
    
    // Make the API request
    const response = await fetch(`${FBA_INVENTORY_API_URL}/api/inventory/batch`, {
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
    
    // Return the inventory information
    return await response.json();
  } catch (error) {
    console.error(`Error fetching inventory in batch:`, error);
    throw error;
  }
}

/**
 * Get overall inventory statistics
 * 
 * @returns {Promise<Object>} - Inventory statistics
 */
async function getInventoryStats() {
  try {
    // Make the API request
    const response = await fetch(`${FBA_INVENTORY_API_URL}/api/inventory/stats`);
    
    // Handle errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Return the inventory statistics
    return await response.json();
  } catch (error) {
    console.error(`Error fetching inventory statistics:`, error);
    throw error;
  }
}

/**
 * Process an Amazon-fulfilled Inventory report file
 * 
 * @param {string} filePath - Path to the report file
 * @returns {Promise<Object>} - Processing result
 */
async function processReport(filePath) {
  try {
    // Make the API request
    const response = await fetch(`${FBA_INVENTORY_API_URL}/api/reports/upload`, {
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
    // Get inventory by SKU
    const inventory = await getInventoryBySku('AM-1000-BK-4W-A1');
    console.log('Inventory:', inventory);
    
    // Get multiple inventory items in a batch
    const inventoryItems = await batchGetInventory(['AM-1000-BK-4W-A1', 'AM-1000-BL-4W-A3']);
    console.log('Batch inventory:', inventoryItems);
    
    // Get inventory statistics
    const stats = await getInventoryStats();
    console.log('Inventory statistics:', stats);
    
    // Process a report file
    const result = await processReport('/path/to/fba-inventory-report.txt');
    console.log('Processing result:', result);
  } catch (error) {
    console.error('Example usage error:', error);
  }
}

// Export the functions for use in the main application
module.exports = {
  getInventoryBySku,
  batchGetInventory,
  getInventoryStats,
  processReport,
}; 