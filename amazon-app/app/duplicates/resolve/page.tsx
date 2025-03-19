'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DuplicateResolution from '@/app/components/DuplicateResolution';
import styles from './page.module.css';

function ResolvePageContent() {
  const [status, setStatus] = useState<'resolving' | 'success' | 'cancelled' | 'error'>('resolving');
  const [result, setResult] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueId = searchParams.get('id');
  
  // Redirect if no issueId is provided
  useEffect(() => {
    if (!issueId) {
      router.push('/all-listings-report');
    }
  }, [issueId, router]);
  
  const handleResolved = (response: any) => {
    if (response.cancelled) {
      setStatus('cancelled');
      // Redirect back to the listings page after a short delay
      setTimeout(() => {
        router.push('/all-listings-report');
      }, 1500);
      return;
    }
    
    setResult(response);
    setStatus('success');
    
    // Redirect back to the listings page after a short delay
    setTimeout(() => {
      router.push('/all-listings-report');
    }, 2000);
  };
  
  if (!issueId) {
    return null; // Will be redirected by the useEffect
  }
  
  return (
    <div className={styles.container}>
      {status === 'resolving' && (
        <DuplicateResolution 
          issueId={issueId} 
          onResolved={handleResolved} 
        />
      )}
      
      {status === 'success' && (
        <div className={styles.resultContainer}>
          <div className={styles.successIcon}>✓</div>
          <h2>Duplicate SKUs Successfully Resolved</h2>
          <p>Your file is now being processed. You will be redirected shortly.</p>
        </div>
      )}
      
      {status === 'cancelled' && (
        <div className={styles.resultContainer}>
          <div className={styles.cancelIcon}>✕</div>
          <h2>Resolution Cancelled</h2>
          <p>No changes were made to your data. You will be redirected shortly.</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className={styles.resultContainer}>
          <div className={styles.errorIcon}>!</div>
          <h2>Error Resolving Duplicates</h2>
          <p>An error occurred while resolving duplicates. Please try again later.</p>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/all-listings-report')}
          >
            Back to Listings
          </button>
        </div>
      )}
    </div>
  );
}

export default function ResolvePage() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading...</div>}>
      <ResolvePageContent />
    </Suspense>
  );
} 