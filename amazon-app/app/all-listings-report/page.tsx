'use client';

import React, { useEffect, useState } from 'react';
import FileUploader from '../components/FileUploader';
import axios from 'axios';
import { Listing, ListingUploadResponse } from '@/types/listing';
import styles from './page.module.css';

interface PaginationData {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface ListingsResponse {
  listings: Listing[];
  pagination: PaginationData;
  totalActiveCount: number;
}

export default function AllListingsReportPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'item-name', 'seller-sku', 'asin1', 'product-id'
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // New state for filtering, searching, and pagination
  const [search, setSearch] = useState('');
  const [fulfillmentChannel, setFulfillmentChannel] = useState('');
  const [status, setStatus] = useState('Active'); // Default to 'Active'
  const [pagination, setPagination] = useState<PaginationData>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 100
  });
  const [searchInputValue, setSearchInputValue] = useState('');

  // Get filter options
  const [fulfillmentChannelOptions, setFulfillmentChannelOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const [totalActiveCount, setTotalActiveCount] = useState<number>(0);

  // Add safe styles handling
  const safeStyles = {
    'all-listings-container': styles?.['all-listings-container'] || 'all-listings-container',
    'error-message': styles?.['error-message'] || 'error-message',
    'filters-container': styles?.['filters-container'] || 'filters-container',
    'search-container': styles?.['search-container'] || 'search-container',
    'search-input': styles?.['search-input'] || 'search-input',
    'search-button': styles?.['search-button'] || 'search-button',
    'filter-container': styles?.['filter-container'] || 'filter-container',
    'filter-select': styles?.['filter-select'] || 'filter-select',
    'table-container': styles?.['table-container'] || 'table-container',
    'listings-table': styles?.['listings-table'] || 'listings-table',
    'column-selector': styles?.['column-selector'] || 'column-selector',
    'column-selector-button': styles?.['column-selector-button'] || 'column-selector-button',
    'column-selector-dropdown': styles?.['column-selector-dropdown'] || 'column-selector-dropdown',
    'column-item': styles?.['column-item'] || 'column-item',
    'pagination': styles?.['pagination'] || 'pagination',
    'page-info': styles?.['page-info'] || 'page-info',
    'page-buttons': styles?.['page-buttons'] || 'page-buttons',
    'page-button': styles?.['page-button'] || 'page-button',
    'active-page': styles?.['active-page'] || 'active-page',
    'listing-count': styles?.['listing-count'] || 'listing-count',
    
    // Add missing properties
    'loading': styles?.['loading'] || 'loading',
    'listings-table-container': styles?.['listings-table-container'] || 'listings-table-container',
    'column-selector-controls': styles?.['column-selector-controls'] || 'column-selector-controls',
    'column-selector-header': styles?.['column-selector-header'] || 'column-selector-header',
    'column-selector-options': styles?.['column-selector-options'] || 'column-selector-options',
    'column-option': styles?.['column-option'] || 'column-option',
    'results-count': styles?.['results-count'] || 'results-count',
    'listings-table-wrapper': styles?.['listings-table-wrapper'] || 'listings-table-wrapper',
    'status-badge': styles?.['status-badge'] || 'status-badge',
    'pagination-button': styles?.['pagination-button'] || 'pagination-button',
    'pagination-active': styles?.['pagination-active'] || 'pagination-active',
    'no-listings': styles?.['no-listings'] || 'no-listings',
    // Handle dynamic status classes
    'status-active': styles?.['status-active'] || 'status-active',
    'status-inactive': styles?.['status-inactive'] || 'status-inactive',
    'status-incomplete': styles?.['status-incomplete'] || 'status-incomplete',
    'status-error': styles?.['status-error'] || 'status-error',
  };

  useEffect(() => {
    // Fetch distinct fulfillment channels for dropdown
    const fetchFulfillmentChannels = async () => {
      try {
        const response = await axios.get('/api/listings/fulfillment-channels');
        if (response.data && Array.isArray(response.data)) {
          setFulfillmentChannelOptions(response.data);
        }
      } catch (err) {
        console.error('Error fetching fulfillment channels:', err);
      }
    };

    // Fetch distinct status options for dropdown
    const fetchStatusOptions = async () => {
      try {
        const response = await axios.get('/api/listings/status-options');
        if (response.data && Array.isArray(response.data)) {
          setStatusOptions(response.data);
        }
      } catch (err) {
        console.error('Error fetching status options:', err);
      }
    };

    fetchFulfillmentChannels();
    fetchStatusOptions();
  }, []);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setIsLoading(true);
        
        // Build query parameters for API request
        const params = new URLSearchParams();
        params.append('page', pagination.currentPage.toString());
        params.append('limit', pagination.pageSize.toString());
        
        if (search) {
          params.append('search', search);
        }
        
        if (fulfillmentChannel) {
          params.append('fulfillmentChannel', fulfillmentChannel);
        }
        
        if (status) {
          params.append('status', status);
        }
        
        const response = await axios.get<ListingsResponse>(`/api/listings?${params.toString()}`);
        setListings(response.data.listings);
        setPagination(response.data.pagination);
        setTotalActiveCount(response.data.totalActiveCount);
        setError(null);
      } catch (err) {
        setError('Failed to fetch listings. Please try again later.');
        console.error('Error fetching listings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [pagination.currentPage, search, fulfillmentChannel, status, refreshTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInputValue);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on new search
  };

  const handleFulfillmentChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFulfillmentChannel(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on filter change
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on filter change
  };

  const handleChangePage = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleUploadComplete = (response: ListingUploadResponse) => {
    // Refresh listings after successful upload
    setRefreshTrigger(prev => prev + 1);
  };

  // All available columns based on headers in All_Listings_Report.txt
  const allColumns = [
    { key: 'item-name', label: 'item-name' },
    { key: 'item-description', label: 'item-description' },
    { key: 'listing-id', label: 'listing-id' },
    { key: 'seller-sku', label: 'seller-sku' },
    { key: 'price', label: 'price' },
    { key: 'quantity', label: 'quantity' },
    { key: 'open-date', label: 'open-date' },
    { key: 'image-url', label: 'image-url' },
    { key: 'item-is-marketplace', label: 'item-is-marketplace' },
    { key: 'product-id-type', label: 'product-id-type' },
    { key: 'zshop-shipping-fee', label: 'zshop-shipping-fee' },
    { key: 'item-note', label: 'item-note' },
    { key: 'item-condition', label: 'item-condition' },
    { key: 'zshop-category1', label: 'zshop-category1' },
    { key: 'zshop-browse-path', label: 'zshop-browse-path' },
    { key: 'zshop-storefront-feature', label: 'zshop-storefront-feature' },
    { key: 'asin1', label: 'asin1' },
    { key: 'asin2', label: 'asin2' },
    { key: 'asin3', label: 'asin3' },
    { key: 'will-ship-internationally', label: 'will-ship-internationally' },
    { key: 'expedited-shipping', label: 'expedited-shipping' },
    { key: 'zshop-boldface', label: 'zshop-boldface' },
    { key: 'product-id', label: 'product-id' },
    { key: 'bid-for-featured-placement', label: 'bid-for-featured-placement' },
    { key: 'add-delete', label: 'add-delete' },
    { key: 'pending-quantity', label: 'pending-quantity' },
    { key: 'fulfillment-channel', label: 'fulfillment-channel' },
    { key: 'merchant-shipping-group', label: 'merchant-shipping-group' },
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
      setVisibleColumns(['item-name', 'seller-sku', 'asin1', 'product-id']);
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

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const maxPageButtons = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxPageButtons / 2));
    let endPage = startPage + maxPageButtons - 1;
    
    if (endPage > pagination.totalPages) {
      endPage = pagination.totalPages;
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const displayingText = pagination.totalCount > 0 
    ? `Displaying ${(pagination.currentPage - 1) * pagination.pageSize + 1} to ${Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of ${pagination.totalCount} listings`
    : 'No listings found';

  return (
    <div className={safeStyles['all-listings-container']}>
      <h1>All Listings Report</h1>
      
      <FileUploader 
        onUploadComplete={handleUploadComplete}
        onUploadError={(errorMsg) => setError(errorMsg)}
        apiEndpoint="/api/all-listings-report/upload"
        statusEndpoint="/api/all-listings-report/upload/status"
      />
      
      {error && (
        <div className={safeStyles['error-message']}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      {/* Filters and Search */}
      <div className={safeStyles['filters-container']}>
        <div className={safeStyles['search-container']}>
          <form onSubmit={handleSearch}>
            <input 
              type="text" 
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              placeholder="Search by SKU, Product ID, or ASIN"
              className={safeStyles['search-input']}
            />
            <button type="submit" className={safeStyles['search-button']}>Search</button>
          </form>
        </div>
        
        <div className={safeStyles['filter-container']}>
          <label htmlFor="status">Status:</label>
          <select 
            id="status" 
            value={status} 
            onChange={handleStatusChange}
            className={safeStyles['filter-select']}
          >
            <option value="">All Statuses</option>
            {statusOptions.map(option => (
              <option key={option} value={option}>{option || 'Unknown'}</option>
            ))}
          </select>
        </div>
        
        <div className={safeStyles['filter-container']}>
          <label htmlFor="fulfillmentChannel">Fulfillment Channel:</label>
          <select 
            id="fulfillmentChannel" 
            value={fulfillmentChannel} 
            onChange={handleFulfillmentChannelChange}
            className={safeStyles['filter-select']}
          >
            <option value="">All Channels</option>
            {fulfillmentChannelOptions.map(channel => (
              <option key={channel} value={channel}>{channel || 'Unknown'}</option>
            ))}
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className={safeStyles.loading}>Loading listings...</div>
      ) : (
        <div className={safeStyles['listings-table-container']}>
          {listings.length > 0 ? (
            <>
              <div className={safeStyles['column-selector-controls']}>
                <button 
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className={safeStyles['column-selector-button']}
                >
                  {showColumnSelector ? 'Hide Column Selector' : 'Show Column Selector'}
                </button>
                
                {showColumnSelector && (
                  <div className={safeStyles['column-selector']}>
                    <div className={safeStyles['column-selector-header']}>
                      <h3>Select Columns to Display</h3>
                      <button onClick={toggleAllColumns}>
                        {visibleColumns.length === allColumns.length ? 'Show Default' : 'Show All'}
                      </button>
                    </div>
                    <div className={safeStyles['column-selector-options']}>
                      {allColumns.map(column => (
                        <label key={column.key} className={safeStyles['column-option']}>
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
              
              <div className={safeStyles['results-count']}>
                {displayingText}
              </div>
              
              <div className={safeStyles['listings-table-wrapper']}>
                <table className={safeStyles['listings-table']}>
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
                                <span className={`${safeStyles['status-badge']} ${safeStyles[`status-${listing.status?.toLowerCase()}`]}`}>
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
              
              {/* Pagination controls */}
              {pagination.totalPages > 1 && (
                <div className={safeStyles['pagination']}>
                  <button 
                    onClick={() => handleChangePage(1)} 
                    disabled={pagination.currentPage === 1}
                    className={safeStyles['pagination-button']}
                  >
                    First
                  </button>
                  
                  <button 
                    onClick={() => handleChangePage(pagination.currentPage - 1)} 
                    disabled={pagination.currentPage === 1}
                    className={safeStyles['pagination-button']}
                  >
                    Previous
                  </button>
                  
                  {getPageNumbers().map(pageNum => (
                    <button 
                      key={pageNum} 
                      onClick={() => handleChangePage(pageNum)}
                      className={`${safeStyles['pagination-button']} ${pageNum === pagination.currentPage ? safeStyles['pagination-active'] : ''}`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => handleChangePage(pagination.currentPage + 1)} 
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={safeStyles['pagination-button']}
                  >
                    Next
                  </button>
                  
                  <button 
                    onClick={() => handleChangePage(pagination.totalPages)} 
                    disabled={pagination.currentPage === pagination.totalPages}
                    className={safeStyles['pagination-button']}
                  >
                    Last
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={safeStyles['no-listings']}>
              <p>No listings found. Upload your Amazon All Listings Report to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 