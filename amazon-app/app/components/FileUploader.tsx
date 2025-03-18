import React, { useState } from 'react';
import axios from 'axios';
import { ListingUploadResponse } from '@/types/listing';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
  onUploadComplete?: (response: ListingUploadResponse) => void;
  onUploadError?: (error: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onUploadComplete,
  onUploadError,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading...');
    
    try {
      const response = await axios.post<ListingUploadResponse>('/api/listings/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });
      
      setUploadStatus(response.data.message);
      
      if (onUploadComplete && response.data.success) {
        onUploadComplete(response.data);
      }
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Failed to upload file';
      
      setUploadStatus(`Error: ${errorMessage}`);
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
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
      
      {isUploading && (
        <div className={styles['file-uploader__progress']}>
          <div 
            className={styles['file-uploader__progress-bar']} 
            style={{ width: `${uploadProgress}%` }}
          ></div>
          <span>{uploadProgress}%</span>
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