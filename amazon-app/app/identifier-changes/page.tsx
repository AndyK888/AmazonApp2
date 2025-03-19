'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './page.module.css';

interface IdentifierChange {
  id: number;
  seller_sku: string;
  item_name: string;
  identifier_type: string;
  old_value: string;
  new_value: string;
  reported_at: string;
  acknowledged: boolean;
  change_type: string;
}

interface OrganizedChange {
  seller_sku: string;
  item_name: string;
  identifiers: Record<string, { value: string; reported_at: string }>;
  lastUpdated: Date;
  changes: IdentifierChange[];
}

export default function IdentifierChangesPage() {
  const [changes, setChanges] = useState<OrganizedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<boolean | null>(false);
  const [selectedChanges, setSelectedChanges] = useState<number[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 50
  });
  
  useEffect(() => {
    fetchChanges();
  }, [acknowledged, pagination.currentPage]);
  
  const fetchChanges = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', pagination.currentPage.toString());
      params.append('limit', pagination.pageSize.toString());
      
      if (acknowledged !== null) {
        params.append('acknowledged', acknowledged.toString());
      }
      
      const response = await axios.get(`/api/listings/identifier-changes?${params.toString()}`);
      
      if (response.data.success) {
        // Group by SKU to get all identifier changes for each SKU
        const organizedChanges = organizeChangesBySku(response.data.changes);
        setChanges(organizedChanges);
        setPagination(response.data.pagination);
      } else {
        setError(response.data.message || 'Failed to fetch changes');
      }
    } catch (err) {
      setError('Error loading changes');
      console.error('Error fetching changes:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Organize changes to show the most recent values for each identifier type
  const organizeChangesBySku = (changes: IdentifierChange[]): OrganizedChange[] => {
    const skuMap = new Map<string, OrganizedChange>();
    
    // First, group all changes by SKU
    changes.forEach(change => {
      if (!skuMap.has(change.seller_sku)) {
        skuMap.set(change.seller_sku, {
          seller_sku: change.seller_sku,
          item_name: change.item_name,
          identifiers: {},
          lastUpdated: new Date(change.reported_at),
          changes: []
        });
      }
      
      const skuEntry = skuMap.get(change.seller_sku)!;
      
      // Update last update time if this change is newer
      const changeDate = new Date(change.reported_at);
      if (changeDate > skuEntry.lastUpdated) {
        skuEntry.lastUpdated = changeDate;
      }
      
      // Store the most recent value for each identifier type
      if (!skuEntry.identifiers[change.identifier_type] || 
          new Date(change.reported_at) > new Date(skuEntry.identifiers[change.identifier_type].reported_at)) {
        skuEntry.identifiers[change.identifier_type] = {
          value: change.new_value,
          reported_at: change.reported_at
        };
      }
      
      // Also store the change for detailed history
      skuEntry.changes.push(change);
    });
    
    // Convert map to array
    return Array.from(skuMap.values())
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  };
  
  const handleAcknowledgeSelected = async () => {
    if (!selectedChanges.length) return;
    
    try {
      setLoading(true);
      
      const response = await axios.post('/api/listings/identifier-changes', {
        changeIds: selectedChanges
      });
      
      if (response.data.success) {
        setSelectedChanges([]);
        fetchChanges();
      } else {
        setError(response.data.message || 'Failed to acknowledge changes');
      }
    } catch (err) {
      setError('Error acknowledging changes');
      console.error('Error acknowledging changes:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= pagination.totalPages) {
      setPagination({ ...pagination, currentPage: page });
    }
  };
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Get all change IDs from currently displayed changes
      const allChanges: number[] = [];
      changes.forEach(item => {
        item.changes.forEach(change => {
          allChanges.push(change.id);
        });
      });
      setSelectedChanges(allChanges);
    } else {
      setSelectedChanges([]);
    }
  };
  
  const handleSelectSku = (sku: string) => {
    // Find the SKU entry
    const skuEntry = changes.find(item => item.seller_sku === sku);
    if (!skuEntry) return;
    
    // Get all change IDs for this SKU
    const skuChangeIds = skuEntry.changes.map(change => change.id);
    
    // Check if all changes for this SKU are already selected
    const allSelected = skuChangeIds.every(id => selectedChanges.includes(id));
    
    if (allSelected) {
      // Remove all changes for this SKU
      setSelectedChanges(selectedChanges.filter(id => !skuChangeIds.includes(id)));
    } else {
      // Add all changes for this SKU
      setSelectedChanges([...selectedChanges, ...skuChangeIds.filter(id => !selectedChanges.includes(id))]);
    }
  };
  
  const toggleDetailsRow = (sku: string) => {
    if (expandedRows.includes(sku)) {
      setExpandedRows(expandedRows.filter(row => row !== sku));
    } else {
      setExpandedRows([...expandedRows, sku]);
    }
  };
  
  if (loading && changes.length === 0) {
    return <div className={styles.loading}>Loading identifier changes...</div>;
  }
  
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }
  
  return (
    <div className={styles.container}>
      <h1>Product Identifier Changes</h1>
      
      {/* Filters */}
      <div className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <label>Status:</label>
          <div className={styles.radioGroup}>
            <label>
              <input 
                type="radio" 
                checked={acknowledged === false} 
                onChange={() => setAcknowledged(false)}
              />
              Unacknowledged
            </label>
            <label>
              <input 
                type="radio" 
                checked={acknowledged === true} 
                onChange={() => setAcknowledged(true)}
              />
              Acknowledged
            </label>
            <label>
              <input 
                type="radio" 
                checked={acknowledged === null} 
                onChange={() => setAcknowledged(null)}
              />
              All
            </label>
          </div>
        </div>
      </div>
      
      {/* Changes table - displays one row per SKU with the most recent changes */}
      <div className={styles.tableContainer}>
        <table className={styles.changesTable}>
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={changes.length > 0 && selectedChanges.length === changes.flatMap(item => item.changes).length}
                />
              </th>
              <th>SKU</th>
              <th>Product</th>
              <th>ASIN</th>
              <th>UPC</th>
              <th>EAN</th>
              <th>FNSKU</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(item => (
              <React.Fragment key={item.seller_sku}>
                <tr className={styles.skuRow}>
                  <td>
                    <input 
                      type="checkbox"
                      checked={item.changes.every(change => selectedChanges.includes(change.id))}
                      onChange={() => handleSelectSku(item.seller_sku)}
                    />
                  </td>
                  <td className={styles.skuCell}>{item.seller_sku}</td>
                  <td>{item.item_name || 'Unknown Item'}</td>
                  <td className={styles.identifierCell}>
                    {item.identifiers.ASIN && (
                      <span className={
                        item.changes.find(c => 
                          c.identifier_type === 'ASIN' && 
                          c.change_type !== 'new'
                        ) ? styles.changedValue : ''
                      }>
                        {item.identifiers.ASIN.value}
                      </span>
                    )}
                  </td>
                  <td className={styles.identifierCell}>
                    {item.identifiers.UPC && (
                      <span className={
                        item.changes.find(c => 
                          c.identifier_type === 'UPC' && 
                          c.change_type !== 'new'
                        ) ? styles.changedValue : ''
                      }>
                        {item.identifiers.UPC.value}
                      </span>
                    )}
                  </td>
                  <td className={styles.identifierCell}>
                    {item.identifiers.EAN && (
                      <span className={
                        item.changes.find(c => 
                          c.identifier_type === 'EAN' && 
                          c.change_type !== 'new'
                        ) ? styles.changedValue : ''
                      }>
                        {item.identifiers.EAN.value}
                      </span>
                    )}
                  </td>
                  <td className={styles.identifierCell}>
                    {item.identifiers.FNSKU && (
                      <span className={
                        item.changes.find(c => 
                          c.identifier_type === 'FNSKU' && 
                          c.change_type !== 'new'
                        ) ? styles.changedValue : ''
                      }>
                        {item.identifiers.FNSKU.value}
                      </span>
                    )}
                  </td>
                  <td>{new Date(item.lastUpdated).toLocaleString()}</td>
                  <td>
                    <button 
                      className={styles.detailsButton}
                      onClick={() => toggleDetailsRow(item.seller_sku)}
                    >
                      {expandedRows.includes(item.seller_sku) ? 'Hide' : 'Show'} History
                    </button>
                  </td>
                </tr>
                
                {/* Expandable details row showing change history for this SKU */}
                {expandedRows.includes(item.seller_sku) && (
                  <tr className={styles.detailsRow}>
                    <td colSpan={9}>
                      <div className={styles.changeHistory}>
                        <h4>Change History for {item.seller_sku}</h4>
                        <table className={styles.historyTable}>
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Change</th>
                              <th>Old Value</th>
                              <th>New Value</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.changes
                              .sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime())
                              .map(change => (
                                <tr key={change.id}>
                                  <td>{change.identifier_type}</td>
                                  <td>{change.change_type}</td>
                                  <td>{change.old_value || '-'}</td>
                                  <td className={styles.newValueCell}>{change.new_value || '-'}</td>
                                  <td>{new Date(change.reported_at).toLocaleString()}</td>
                                </tr>
                              ))
                            }
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination controls */}
      <div className={styles.pagination}>
        <button 
          onClick={() => handlePageChange(1)} 
          disabled={pagination.currentPage === 1}
          className={styles.pageButton}
        >
          &laquo; First
        </button>
        <button 
          onClick={() => handlePageChange(pagination.currentPage - 1)} 
          disabled={pagination.currentPage === 1}
          className={styles.pageButton}
        >
          &lsaquo; Prev
        </button>
        
        <span className={styles.pageInfo}>
          Page {pagination.currentPage} of {pagination.totalPages}
          &nbsp;({pagination.totalCount} total)
        </span>
        
        <button 
          onClick={() => handlePageChange(pagination.currentPage + 1)} 
          disabled={pagination.currentPage === pagination.totalPages}
          className={styles.pageButton}
        >
          Next &rsaquo;
        </button>
        <button 
          onClick={() => handlePageChange(pagination.totalPages)} 
          disabled={pagination.currentPage === pagination.totalPages}
          className={styles.pageButton}
        >
          Last &raquo;
        </button>
      </div>
      
      {/* Batch action buttons */}
      <div className={styles.actionButtons}>
        <button 
          className={styles.acknowledgeButton}
          disabled={selectedChanges.length === 0 || acknowledged === true}
          onClick={handleAcknowledgeSelected}
        >
          Acknowledge Selected
        </button>
      </div>
    </div>
  );
} 