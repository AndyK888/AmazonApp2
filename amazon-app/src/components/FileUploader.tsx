import React, { useEffect, useState } from 'react';
import { createLogger } from '../utils/logger';
import Uppy from '@uppy/core';
import { DragDrop, StatusBar } from '@uppy/react';
import { globalErrorHandler } from '../utils/errorHandler';

// Import required CSS
import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import '@uppy/status-bar/dist/style.min.css';
import '@uppy/drag-drop/dist/style.css';

// Create logger instance
const logger = createLogger('FileUploader');

interface FileUploaderProps {
  onFilesUploaded: (files: any[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Uppy instance
  const uppy = React.useMemo(() => {
    logger.info('Initializing Uppy instance');
    const instance = new Uppy({
      id: 'listing-file-uploader',
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ['.csv', '.txt', '.tsv', '.xlsx']
      }
    });

    // Log instance details
    logger.debug('Uppy instance created', { 
      uppyVersion: Uppy.VERSION,
      uppyId: instance.getID(),
      hasCloseMethod: typeof (instance as any).close === 'function'
    });

    return instance;
  }, []);

  useEffect(() => {
    // Log when the component mounts
    logger.info('FileUploader component mounted');
    
    // Set up event handlers
    uppy.on('file-added', (file) => {
      logger.info(`File added: ${file.name}`, { fileType: file.type, fileSize: file.size });
      setErrorMessage(null);
    });
    
    uppy.on('upload', () => {
      logger.info('Upload started');
    });
    
    uppy.on('complete', (result) => {
      const successful = result.successful || [];
      const failed = result.failed || [];
      logger.info(`Upload complete: ${successful.length} files successful, ${failed.length} files failed`);
      
      if (successful.length > 0) {
        setFiles(successful);
        if (onFilesUploaded) {
          onFilesUploaded(successful);
        }
      }
    });
    
    uppy.on('error', (error) => {
      logger.error('Uppy error:', error);
      setErrorMessage(`Error: ${error.message}`);
      globalErrorHandler(new Error('Upload failed: ' + error.message));
    });
    
    // Handle restriction errors
    uppy.on('restriction-failed', (file, error) => {
      logger.warn(`File ${file?.name || 'unknown'} failed restriction: ${error.message}`);
      setErrorMessage(`File ${file?.name || ''} cannot be uploaded: ${error.message}`);
    });
    
    // Cleanup function
    return () => {
      logger.info('FileUploader component unmounting');
      try {
        logger.debug('Uppy instance before close', { 
          isUppy: uppy instanceof Uppy,
          uppyId: uppy.getID(),
          hasCloseMethod: typeof (uppy as any).close === 'function',
          closeType: typeof (uppy as any).close
        });
        
        // Try to close using any typing
        (uppy as any).close();
        logger.info('Uppy instance closed successfully');
      } catch (error) {
        logger.error('Error closing Uppy instance:', error);
      }
    };
  }, [uppy, onFilesUploaded]);

  return (
    <div className="file-uploader">
      <div className="uploader-header">
        <h3>Import Inventory</h3>
        <p>Drag and drop a CSV, TSV, or TXT file</p>
      </div>
      
      {errorMessage && (
        <div className="uploader-error">
          {errorMessage}
        </div>
      )}
      
      <DragDrop
        uppy={uppy}
        locale={{
          strings: {
            dropHereOr: 'Drop file here or %{browse}',
            browse: 'browse'
          }
        } as any}
      />
      
      <div className="uploader-status-bar">
        <StatusBar
          uppy={uppy}
          hideUploadButton
          hideAfterFinish={false}
        />
      </div>
      
      {files.length > 0 && (
        <div className="uploader-success">
          <p>File uploaded successfully: {files[0].name}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader; 