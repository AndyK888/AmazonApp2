'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './DuplicateNotification.module.css';

interface DuplicateIssue {
  id: number;
  file_id: number;
  created_at: string;
  original_name?: string;
  file_name?: string;
  duplicate_info: Record<string, any>;
  item_count: number;
}

export default function DuplicateNotification() {
  const [pendingIssues, setPendingIssues] = useState<DuplicateIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    checkPendingDuplicates();
    
    // Poll for new issues every 30 seconds
    const interval = setInterval(checkPendingDuplicates, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const checkPendingDuplicates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/duplicates?status=pending');
      
      if (response.data.success) {
        setPendingIssues(response.data.issues);
      }
    } catch (err) {
      console.error('Error checking pending duplicates:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResolveClick = (issueId: number) => {
    router.push(`/duplicates/resolve?id=${issueId}`);
  };
  
  if (loading || pendingIssues.length === 0) {
    return null;
  }
  
  return (
    <div className={styles.notificationContainer}>
      <div className={styles.notificationHeader}>
        <span className={styles.warningIcon}>⚠️</span>
        <h3>Duplicate SKUs Detected</h3>
      </div>
      
      <div className={styles.notificationBody}>
        <p>
          {pendingIssues.length === 1 ? 
            'One file has' : 
            `${pendingIssues.length} files have`} duplicate SKUs that require your attention.
        </p>
        
        <ul className={styles.issuesList}>
          {pendingIssues.map(issue => (
            <li key={issue.id} className={styles.issueItem}>
              <div className={styles.issueInfo}>
                <span className={styles.fileName}>{issue.original_name || issue.file_name}</span>
                <span className={styles.fileDate}>
                  Uploaded {new Date(issue.created_at).toLocaleString()}
                </span>
                <span className={styles.duplicateCount}>
                  {issue.item_count} duplicate SKUs
                </span>
              </div>
              
              <button 
                className={styles.resolveButton}
                onClick={() => handleResolveClick(issue.id)}
              >
                Resolve
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 