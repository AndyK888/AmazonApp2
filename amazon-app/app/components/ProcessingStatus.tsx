'use client';

import React, { useState, useEffect } from 'react';
import styles from './ProcessingStatus.module.css';

interface ProcessingStatusProps {
  fileId?: string;
  onComplete?: (success: boolean) => void;
  statusEndpoint?: string;
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

export default function ProcessingStatus({ fileId, onComplete, statusEndpoint }: ProcessingStatusProps) {
  const [status, setStatus] = useState<FileStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Create safe styles object for handling undefined CSS modules
  const safeStyles = {
    container: styles?.container || 'container',
    spinner: styles?.spinner || 'spinner',
    error: styles?.error || 'error',
    statusCompleted: styles?.statusCompleted || 'statusCompleted',
    statusProcessing: styles?.statusProcessing || 'statusProcessing',
    statusError: styles?.statusError || 'statusError',
    statusPending: styles?.statusPending || 'statusPending',
    fileInfo: styles?.fileInfo || 'fileInfo',
    statusRow: styles?.statusRow || 'statusRow',
    label: styles?.label || 'label',
    status: styles?.status || 'status',
    progressInfo: styles?.progressInfo || 'progressInfo',
    progressBar: styles?.progressBar || 'progressBar',
    progressFill: styles?.progressFill || 'progressFill',
    completionInfo: styles?.completionInfo || 'completionInfo',
    infoRow: styles?.infoRow || 'infoRow',
    errorContainer: styles?.errorContainer || 'errorContainer',
    errorTitle: styles?.errorTitle || 'errorTitle',
    errorMessage: styles?.errorMessage || 'errorMessage'
  };

  useEffect(() => {
    if (!fileId) return;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        
        // Determine the correct URL format based on the endpoint provided
        let url;
        if (statusEndpoint && statusEndpoint.includes('?')) {
          // Endpoint already has a query parameter
          url = `${statusEndpoint}&fileId=${fileId}`;
        } else if (statusEndpoint && !statusEndpoint.includes('/status/')) {
          // Endpoint uses query parameters
          url = `${statusEndpoint}?fileId=${fileId}`;
        } else {
          // Endpoint uses path parameters
          url = statusEndpoint 
            ? `${statusEndpoint}/${fileId}`
            : `/api/listings/upload/status/${fileId}`;
        }
        
        const response = await fetch(url);
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

    // Poll for updates every 1 second if the file is still processing
    const intervalId = setInterval(() => {
      if (status?.status === 'pending' || status?.status === 'processing') {
        fetchStatus();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [fileId, status?.status, onComplete, statusEndpoint]);

  if (!fileId) {
    return null;
  }

  if (loading && !status) {
    return (
      <div className={safeStyles.container}>
        <h3>Checking status...</h3>
        <div className={safeStyles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={safeStyles.container}>
        <h3>Error</h3>
        <div className={safeStyles.error}>{error}</div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'completed':
        return safeStyles.statusCompleted;
      case 'processing':
        return safeStyles.statusProcessing;
      case 'error':
        return safeStyles.statusError;
      default:
        return safeStyles.statusPending;
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
    <div className={safeStyles.container}>
      <h3>File Processing Status</h3>
      
      <div className={safeStyles.fileInfo}>
        <strong>File:</strong> {status.fileName}
      </div>
      
      <div className={safeStyles.statusRow}>
        <span className={safeStyles.label}>Status:</span>
        <span className={`${safeStyles.status} ${getStatusColor()}`}>
          {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
        </span>
      </div>
      
      {(status.status === 'processing' || status.status === 'completed') && (
        <>
          <div className={safeStyles.progressInfo}>
            <span>{status.processedRows} of {status.totalRows} rows processed</span>
            <span>{status.progress}%</span>
          </div>
          
          <div className={safeStyles.progressBar}>
            <div 
              className={safeStyles.progressFill} 
              style={{ width: `${status.progress}%` }}
            ></div>
          </div>
          
          {status.status === 'completed' && (
            <div className={safeStyles.completionInfo}>
              <div className={safeStyles.infoRow}>
                <strong>Listings Imported:</strong> {status.listingsCount}
              </div>
              <div className={safeStyles.infoRow}>
                <strong>Completed At:</strong> {formatDate(status.completedAt)}
              </div>
              <div className={safeStyles.infoRow}>
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
        <div className={safeStyles.errorContainer}>
          <div className={safeStyles.errorTitle}>Error Details:</div>
          <div className={safeStyles.errorMessage}>{status.errorMessage || 'Unknown error'}</div>
        </div>
      )}
    </div>
  );
} 