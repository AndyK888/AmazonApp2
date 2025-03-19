'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.css';
import axios from 'axios';
import styles from './InventoryTable.module.css';

// Register all Handsontable modules
registerAllModules();

interface InventoryItem {
  id?: number;
  seller_sku: string;
  quantity: number;
  asin: string;
  ean: string;
  upc: string;
}

export default function InventoryTable() {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        // Normally we'd fetch from an API, but for demo we'll use dummy data
        // const response = await axios.get('/api/inventory');
        // setData(response.data);
        
        // Demo data
        const demoData: InventoryItem[] = [
          { id: 1, seller_sku: 'SKU001', quantity: 10, asin: 'B00EXAMPLE1', ean: '1234567890123', upc: '012345678901' },
          { id: 2, seller_sku: 'SKU002', quantity: 5, asin: 'B00EXAMPLE2', ean: '2345678901234', upc: '123456789012' },
          { id: 3, seller_sku: 'SKU003', quantity: 20, asin: 'B00EXAMPLE3', ean: '3456789012345', upc: '234567890123' },
          { id: 4, seller_sku: 'SKU004', quantity: 0, asin: 'B00EXAMPLE4', ean: '4567890123456', upc: '345678901234' },
          { id: 5, seller_sku: 'SKU005', quantity: 15, asin: 'B00EXAMPLE5', ean: '5678901234567', upc: '456789012345' },
        ];
        setData(demoData);
      } catch (err) {
        setError('Failed to load inventory data');
        console.error('Error fetching inventory:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Handle data changes
  const handleChange = useCallback((changes: any[] | null) => {
    if (!changes) return;
    
    // Create a new data array with the changes
    const newData = [...data];
    
    changes.forEach(([row, prop, oldValue, newValue]) => {
      if (oldValue !== newValue) {
        newData[row][prop as keyof InventoryItem] = newValue;
        
        // In a real app, you'd make an API call to update the data
        // Example:
        // const itemId = newData[row].id;
        // axios.patch(`/api/inventory/${itemId}`, { [prop]: newValue });
      }
    });
    
    setData(newData);
  }, [data]);

  // Add a new row
  const handleAddRow = useCallback(() => {
    const newRow: InventoryItem = {
      seller_sku: '',
      quantity: 0,
      asin: '',
      ean: '',
      upc: '',
    };
    
    setData([...data, newRow]);
    
    // In a real app, you'd make an API call to create a new item
    // Example:
    // axios.post('/api/inventory', newRow);
  }, [data]);

  if (loading) {
    return <div className={styles.loading}>Loading inventory data...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.inventoryTableContainer}>
      <div className={styles.tableHeader}>
        <h2>Product Inventory</h2>
        <button className={styles.addButton} onClick={handleAddRow}>
          Add New Item
        </button>
      </div>
      
      <HotTable
        data={data}
        columns={[
          { data: 'seller_sku', title: 'Seller SKU' },
          { data: 'quantity', title: 'Quantity', type: 'numeric' },
          { data: 'asin', title: 'ASIN' },
          { data: 'ean', title: 'EAN' },
          { data: 'upc', title: 'UPC' }
        ]}
        colHeaders={['Seller SKU', 'Quantity', 'ASIN', 'EAN', 'UPC']}
        rowHeaders={true}
        height="500px"
        width="100%"
        licenseKey="non-commercial-and-evaluation"
        afterChange={handleChange}
        contextMenu={true}
        stretchH="all"
        className={styles.hotTable}
      />
      
      <div className={styles.tableFooter}>
        <p>Total Items: {data.length}</p>
      </div>
    </div>
  );
} 