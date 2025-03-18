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
            <div className={styles['listings-table-wrapper']}>
              <table className={styles['listings-table']}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>ASIN</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Fulfillment</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td>{listing.seller_sku}</td>
                      <td>{listing.item_name}</td>
                      <td>{listing.asin1}</td>
                      <td>${listing.price?.toFixed(2) || 'N/A'}</td>
                      <td>{listing.quantity}</td>
                      <td>
                        <span className={`${styles['status-badge']} ${styles[`status-${listing.status?.toLowerCase()}`]}`}>
                          {listing.status || 'Unknown'}
                        </span>
                      </td>
                      <td>{listing.fulfillment_channel || 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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