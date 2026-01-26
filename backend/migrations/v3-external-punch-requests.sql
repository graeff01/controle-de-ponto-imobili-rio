-- Migration: Create external_punch_requests table
-- Description: Table to store external punch requests from consultoras (mobile visits)
-- Date: 2026-01-26

CREATE TABLE IF NOT EXISTS external_punch_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    photo_url TEXT,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_external_punch_user_id ON external_punch_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_external_punch_status ON external_punch_requests(status);
CREATE INDEX IF NOT EXISTS idx_external_punch_timestamp ON external_punch_requests(timestamp);

-- Add comment
COMMENT ON TABLE external_punch_requests IS 'Stores external punch requests from mobile consultoras requiring approval';
