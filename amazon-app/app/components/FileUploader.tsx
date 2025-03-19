import React, { useState } from 'react';
import axios from 'axios';
import { ListingUploadResponse } from '@/types/listing';
import styles from './FileUploader.module.css';
import ProcessingStatus from './ProcessingStatus';

interface FileUploaderProps {
  onUploadComplete?: (response: ListingUploadResponse) => void;
  onUploadError?: (error: string) => void;
}

type ProcessStage = 'idle' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error';

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
  const [fileId, setFileId] = useState<string | null>(null);

  const addStatusMessage = (message: string) => {
    setStatusMessages(prev => [...prev, message]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setUploadStatus(null);
      setProcessStage('idle');
      setStatusMessages([]);
      setFileId(null);
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
    setUploadStatus('Uploading your report...');
    setProcessStage('uploading');
    setStatusMessages([`Starting upload of ${file.name}`]);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Upload the file
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
              addStatusMessage('Upload complete. File will be processed in the background.');
            }
          }
        },
      });
      
      // File was uploaded, now it will be processed in the background
      if (response.data.success) {
        setProcessStage('uploaded');
        if (response.data.fileId) {
          setFileId(response.data.fileId);
        }
        setUploadStatus('File uploaded successfully. Processing will continue in the background.');
        addStatusMessage('File queued for background processing. You can check the status below.');
      } else {
        throw new Error(response.data.message || 'File upload failed');
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

  // Handle processing completion
  const handleProcessingComplete = (success: boolean) => {
    setProcessStage(success ? 'completed' : 'error');
    
    if (success) {
      addStatusMessage('File processing completed successfully!');
      if (onUploadComplete) {
        onUploadComplete({
          success: true,
          message: 'File processed successfully',
          count: 0 // We don't know the count here, it would be shown in the ProcessingStatus component
        });
      }
    } else {
      addStatusMessage('File processing failed. See error details below.');
      if (onUploadError) {
        onUploadError('File processing failed');
      }
    }
  };

  // Get the progress percentage for the upload stage only
  const getProgressPercentage = () => {
    if (processStage === 'uploading') {
      return uploadProgress;
    } else if (processStage === 'uploaded' || processStage === 'processing' || 
              processStage === 'completed' || processStage === 'error') {
      return 100;
    }
    return 0;
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
          disabled={isUploading || processStage === 'processing'} 
        />
        <p className={styles['file-uploader__filename']}>
          {file ? file.name : 'No file selected'}
        </p>
      </div>
      
      <p className={styles['file-uploader__hint']}>
        Supported format: Tab-delimited All_Listings_Report.txt from Amazon Seller Central
      </p>
      
      <button 
        className={styles['file-uploader__button']} 
        onClick={handleUpload} 
        disabled={!file || isUploading || processStage === 'processing' || processStage === 'uploaded'}
      >
        Upload File
      </button>
      
      {processStage !== 'idle' && processStage !== 'error' && (
        <div className={styles['file-uploader__progress-container']}>
          {/* Only show upload progress for the actual upload phase */}
          {processStage === 'uploading' && (
            <>
              <div className={styles['file-uploader__progress']}>
                <div 
                  className={styles['file-uploader__progress-bar']}
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className={styles['file-uploader__progress-text']}>
                Uploading file: {getProgressPercentage()}%
              </div>
            </>
          )}
          
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

      {/* Show processing status component once file is uploaded */}
      {fileId && (processStage === 'uploaded' || processStage === 'processing' || processStage === 'completed') && (
        <ProcessingStatus fileId={fileId} onComplete={handleProcessingComplete} />
      )}
    </div>
  );
};

export default FileUploader; 