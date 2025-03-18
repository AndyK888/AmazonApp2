'use client';

import React, { useEffect, useState } from 'react';
import FileUploader from '../components/FileUploader';
import axios from 'axios';
import { Listing, ListingUploadResponse } from '@/types/listing';
import styles from './page.module.css';

export default function AllListingsReportPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'seller_sku', 'item_name', 'asin1', 'price', 'quantity', 'status', 'fulfillment_channel'
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get<Listing[]>('/api/listings');
        setListings(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch listings. Please try again later.');
        console.error('Error fetching listings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [refreshTrigger]);

  const handleUploadComplete = (response: ListingUploadResponse) => {
    // Refresh listings after successful upload
    setRefreshTrigger(prev => prev + 1);
  };

  // All available columns based on headers in All_Listings_Report.txt
  const allColumns = [
    { key: 'item_name', label: 'item-name' },
    { key: 'item_description', label: 'item-description' },
    { key: 'listing_id', label: 'listing-id' },
    { key: 'seller_sku', label: 'seller-sku' },
    { key: 'price', label: 'price' },
    { key: 'quantity', label: 'quantity' },
    { key: 'open_date', label: 'open-date' },
    { key: 'image_url', label: 'image-url' },
    { key: 'item_is_marketplace', label: 'item-is-marketplace' },
    { key: 'product_id_type', label: 'product-id-type' },
    { key: 'zshop_shipping_fee', label: 'zshop-shipping-fee' },
    { key: 'item_note', label: 'item-note' },
    { key: 'item_condition', label: 'item-condition' },
    { key: 'zshop_category1', label: 'zshop-category1' },
    { key: 'zshop_browse_path', label: 'zshop-browse-path' },
    { key: 'zshop_storefront_feature', label: 'zshop-storefront-feature' },
    { key: 'asin1', label: 'asin1' },
    { key: 'asin2', label: 'asin2' },
    { key: 'asin3', label: 'asin3' },
    { key: 'will_ship_internationally', label: 'will-ship-internationally' },
    { key: 'expedited_shipping', label: 'expedited-shipping' },
    { key: 'zshop_boldface', label: 'zshop-boldface' },
    { key: 'product_id', label: 'product-id' },
    { key: 'bid_for_featured_placement', label: 'bid-for-featured-placement' },
    { key: 'add_delete', label: 'add-delete' },
    { key: 'pending_quantity', label: 'pending-quantity' },
    { key: 'fulfillment_channel', label: 'fulfillment-channel' },
    { key: 'merchant_shipping_group', label: 'merchant-shipping-group' },
    { key: 'status', label: 'status' }
  ];

  const toggleColumnVisibility = (columnKey: string) => {
    if (visibleColumns.includes(columnKey)) {
      setVisibleColumns(visibleColumns.filter(col => col !== columnKey));
    } else {
      setVisibleColumns([...visibleColumns, columnKey]);
    }
  };

  const toggleAllColumns = () => {
    if (visibleColumns.length === allColumns.length) {
      // Show only default columns if all are currently visible
      setVisibleColumns(['seller_sku', 'item_name', 'asin1', 'price', 'quantity', 'status', 'fulfillment_channel']);
    } else {
      // Show all columns
      setVisibleColumns(allColumns.map(col => col.key));
    }
  };

  // Format value for display based on data type
  const formatCellValue = (listing: Listing, column: string) => {
    const value = listing[column as keyof Listing];
    
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    
    if (column === 'price' && typeof value === 'number') return `$${value.toFixed(2)}`;
    
    return String(value);
  };

  return (
    <div className={styles['all-listings-container']}>
      <h1>All Listings Report</h1>
      
      <FileUploader 
        onUploadComplete={handleUploadComplete}
        onUploadError={(errorMsg) => setError(errorMsg)}
      />
      
      {error && (
        <div className={styles['error-message']}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {isLoading ? (
        <div className={styles.loading}>Loading listings...</div>
      ) : (
        <div className={styles['listings-table-container']}>
          <div className={styles['listings-stats']}>
            <div className={styles['stat-box']}>
              <h3>Total Listings</h3>
              <p>{listings.length}</p>
            </div>
            <div className={styles['stat-box']}>
              <h3>Active Listings</h3>
              <p>{listings.filter(l => l.status === 'Active').length}</p>
            </div>
            <div className={styles['stat-box']}>
              <h3>Total Inventory</h3>
              <p>{listings.reduce((sum, l) => sum + (l.quantity || 0), 0)}</p>
            </div>
          </div>
          
          {listings.length > 0 ? (
            <>
              <div className={styles['column-selector-controls']}>
                <button 
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className={styles['column-selector-button']}
                >
                  {showColumnSelector ? 'Hide Column Selector' : 'Show Column Selector'}
                </button>
                
                {showColumnSelector && (
                  <div className={styles['column-selector']}>
                    <div className={styles['column-selector-header']}>
                      <h3>Select Columns to Display</h3>
                      <button onClick={toggleAllColumns}>
                        {visibleColumns.length === allColumns.length ? 'Show Default' : 'Show All'}
                      </button>
                    </div>
                    <div className={styles['column-selector-options']}>
                      {allColumns.map(column => (
                        <label key={column.key} className={styles['column-option']}>
                          <input
                            type="checkbox"
                            checked={visibleColumns.includes(column.key)}
                            onChange={() => toggleColumnVisibility(column.key)}
                          />
                          {column.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className={styles['listings-table-wrapper']}>
                <table className={styles['listings-table']}>
                  <thead>
                    <tr>
                      {allColumns
                        .filter(column => visibleColumns.includes(column.key))
                        .map(column => (
                          <th key={column.key}>{column.label}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((listing) => (
                      <tr key={listing.id}>
                        {allColumns
                          .filter(column => visibleColumns.includes(column.key))
                          .map(column => (
                            <td key={`${listing.id}-${column.key}`}>
                              {column.key === 'status' ? (
                                <span className={`${styles['status-badge']} ${styles[`status-${listing.status?.toLowerCase()}`]}`}>
                                  {listing.status || 'Unknown'}
                                </span>
                              ) : (
                                formatCellValue(listing, column.key)
                              )}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className={styles['no-listings']}>
              <p>No listings found. Upload your Amazon All Listings Report to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 