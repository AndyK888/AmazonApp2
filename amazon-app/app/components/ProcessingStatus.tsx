'use client';

import React, { useState, useEffect } from 'react';
import styles from './ProcessingStatus.module.css';

interface ProcessingStatusProps {
  fileId?: string;
  onComplete?: (success: boolean) => void;
}

interface FileStatus {
  fileId: string;
  fileName: string;
  status: string;
  processedRows: number;
  totalRows: number;
  progress: number;
  listingsCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export default function ProcessingStatus({ fileId, onComplete }: ProcessingStatusProps) {
  const [status, setStatus] = useState<FileStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!fileId) return;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/listings/upload/status/${fileId}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus(data);
          setError(null);

          // Notify parent component if processing is complete or failed
          if (data.status === 'completed' && onComplete) {
            onComplete(true);
          } else if (data.status === 'error' && onComplete) {
            onComplete(false);
          }
        } else {
          setError(data.message || 'Failed to fetch status');
        }
      } catch (err) {
        setError('Error fetching status');
        console.error('Error fetching file status:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll for updates every 2 seconds if the file is still processing
    const intervalId = setInterval(() => {
      if (status?.status === 'pending' || status?.status === 'processing') {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [fileId, status?.status, onComplete]);

  if (!fileId) {
    return null;
  }

  if (loading && !status) {
    return (
      <div className={styles.container}>
        <h3>Checking status...</h3>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h3>Error</h3>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return styles.statusCompleted;
      case 'processing':
        return styles.statusProcessing;
      case 'error':
        return styles.statusError;
      default:
        return styles.statusPending;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className={styles.container}>
      <h3>File Processing Status</h3>
      
      <div className={styles.fileInfo}>
        <strong>File:</strong> {status.fileName}
      </div>
      
      <div className={styles.statusRow}>
        <span className={styles.label}>Status:</span>
        <span className={`${styles.status} ${getStatusColor()}`}>
          {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
        </span>
      </div>
      
      {(status.status === 'processing' || status.status === 'completed') && (
        <>
          <div className={styles.progressInfo}>
            <span>{status.processedRows} of {status.totalRows} rows processed</span>
            <span>{status.progress}%</span>
          </div>
          
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${status.progress}%` }}
            ></div>
          </div>
          
          {status.status === 'completed' && (
            <div className={styles.completionInfo}>
              <div className={styles.infoRow}>
                <strong>Listings Imported:</strong> {status.listingsCount}
              </div>
              <div className={styles.infoRow}>
                <strong>Completed At:</strong> {formatDate(status.completedAt)}
              </div>
              <div className={styles.infoRow}>
                <strong>Duration:</strong> {
                  status.completedAt 
                    ? Math.round((new Date(status.completedAt).getTime() - new Date(status.createdAt).getTime()) / 1000)
                    : 'N/A'
                } seconds
              </div>
            </div>
          )}
        </>
      )}
      
      {status.status === 'error' && (
        <div className={styles.errorContainer}>
          <div className={styles.errorTitle}>Error Details:</div>
          <div className={styles.errorMessage}>{status.errorMessage || 'Unknown error'}</div>
        </div>
      )}
    </div>
  );
} 