import React, { useState } from 'react';
import axios from 'axios';
import { ListingUploadResponse } from '@/types/listing';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
  onUploadComplete?: (response: ListingUploadResponse) => void;
  onUploadError?: (error: string) => void;
}

type ProcessStage = 'idle' | 'uploading' | 'parsing' | 'importing' | 'completed' | 'error';

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onUploadComplete,
  onUploadError,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [processStage, setProcessStage] = useState<ProcessStage>('idle');
  const [statusMessages, setStatusMessages] = useState<string[]>([]);

  const addStatusMessage = (message: string) => {
    setStatusMessages(prev => [...prev, message]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setUploadStatus(null);
      setProcessStage('idle');
      setStatusMessages([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('No file selected');
      return;
    }

    // Reset states
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Processing your report...');
    setProcessStage('uploading');
    setStatusMessages([`Starting upload of ${file.name}`]);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Step 1: Upload the file
      setProcessStage('uploading');
      addStatusMessage('Uploading file to server...');
      
      const response = await axios.post<ListingUploadResponse>('/api/listings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
            
            if (progress === 100) {
              setProcessStage('parsing');
              addStatusMessage('Upload complete. Parsing report data...');
              
              // Simulate parsing progress
              setTimeout(() => {
                setProcessStage('importing');
                addStatusMessage('Parsing complete. Importing to database...');
                
                // Simulate database import progress
                // In a real implementation, we'd get this from server via websockets or polling
                setTimeout(() => {
                  setProcessStage('completed');
                  addStatusMessage(`Import complete. ${response.data.count || 'All'} records processed.`);
                }, 2000);
              }, 1500);
            }
          }
        },
      });
      
      // Show final status message
      setUploadStatus(response.data.message);
      
      // Show any errors that occurred during processing
      if (response.data.errors && response.data.errors.length > 0) {
        response.data.errors.forEach(error => {
          addStatusMessage(`Error: ${error}`);
        });
      }
      
      if (onUploadComplete && response.data.success) {
        onUploadComplete(response.data);
      }
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Failed to upload file';
      
      setUploadStatus(`Error: ${errorMessage}`);
      setProcessStage('error');
      addStatusMessage(`Error: ${errorMessage}`);
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Get the progress percentage based on the current stage
  const getProgressPercentage = () => {
    switch (processStage) {
      case 'idle': return 0;
      case 'uploading': return uploadProgress * 0.4; // 40% of progress bar for upload
      case 'parsing': return 40 + (uploadProgress * 0.3); // 30% for parsing
      case 'importing': return 70 + (uploadProgress * 0.3); // 30% for DB import
      case 'completed': return 100;
      case 'error': return 100;
      default: return 0;
    }
  };
  
  return (
    <div className={styles['file-uploader']}>
      <h3>Upload All Listings Report</h3>
      <p>Upload your Amazon All Listings Report to update your inventory database.</p>
      
      <div className={styles['file-uploader__input']}>
        <input 
          type="file" 
          accept=".txt,.csv" 
          onChange={handleFileChange} 
          disabled={isUploading} 
        />
        <p className={styles['file-uploader__filename']}>
          {file ? file.name : 'No file selected'}
        </p>
      </div>
      
      <button 
        className={styles['file-uploader__button']} 
        onClick={handleUpload} 
        disabled={!file || isUploading}
      >
        Upload File
      </button>
      
      {processStage !== 'idle' && (
        <div className={styles['file-uploader__progress-container']}>
          <div className={styles['file-uploader__stage-indicator']}>
            <div className={`${styles['file-uploader__stage']} ${processStage === 'uploading' || processStage === 'parsing' || processStage === 'importing' || processStage === 'completed' ? styles.active : ''} ${processStage === 'parsing' || processStage === 'importing' || processStage === 'completed' ? styles.completed : ''}`}>
              Upload
            </div>
            <div className={`${styles['file-uploader__stage']} ${processStage === 'parsing' || processStage === 'importing' || processStage === 'completed' ? styles.active : ''} ${processStage === 'importing' || processStage === 'completed' ? styles.completed : ''}`}>
              Parse
            </div>
            <div className={`${styles['file-uploader__stage']} ${processStage === 'importing' || processStage === 'completed' ? styles.active : ''} ${processStage === 'completed' ? styles.completed : ''}`}>
              Import
            </div>
            <div className={`${styles['file-uploader__stage']} ${processStage === 'completed' ? styles.active : ''}`}>
              Complete
            </div>
          </div>
          
          <div className={styles['file-uploader__progress']}>
            <div 
              className={`${styles['file-uploader__progress-bar']} ${processStage === 'error' ? styles.error : ''}`}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          
          <div className={styles['file-uploader__status-log']}>
            {statusMessages.map((message, index) => (
              <div key={index} className={styles['file-uploader__status-message']}>
                {message}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {uploadStatus && (
        <p className={`${styles['file-uploader__status']} ${uploadStatus.startsWith('Error') ? styles.error : styles.success}`}>
          {uploadStatus}
        </p>
      )}
    </div>
  );
};

export default FileUploader; 