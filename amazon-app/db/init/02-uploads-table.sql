-- Create table for tracking uploaded files and their processing status
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'completed', 'error'
    processed_rows INTEGER DEFAULT 0,
    total_rows INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add trigger to update timestamps
CREATE TRIGGER update_uploaded_files_updated_at
BEFORE UPDATE ON uploaded_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add file_id column to listings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'file_id'
    ) THEN
        ALTER TABLE listings ADD COLUMN file_id UUID REFERENCES uploaded_files(id);
    END IF;
END $$;

-- Create indices
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX IF NOT EXISTS idx_listings_file_id ON listings(file_id);

-- Create view for processing status
CREATE OR REPLACE VIEW file_processing_status AS
SELECT 
    uf.id,
    uf.original_name,
    uf.status,
    uf.processed_rows,
    uf.total_rows,
    uf.error_message,
    uf.created_at,
    uf.completed_at,
    CASE 
        WHEN uf.total_rows > 0 THEN 
            ROUND((uf.processed_rows::numeric / uf.total_rows) * 100, 1)
        ELSE
            0
    END AS progress_percentage,
    COUNT(l.id) AS listings_count
FROM 
    uploaded_files uf
LEFT JOIN 
    listings l ON l.file_id = uf.id
GROUP BY 
    uf.id, uf.original_name, uf.status, uf.processed_rows, uf.total_rows, 
    uf.error_message, uf.created_at, uf.completed_at; 