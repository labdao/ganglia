-- Add StartTime and EndTime columns to flows table
ALTER TABLE flows
ADD COLUMN start_time TIMESTAMP,
ADD COLUMN end_time TIMESTAMP;

-- Add Timestamp column to tools table
ALTER TABLE tools
ADD COLUMN timestamp TIMESTAMP;

-- Add CreatedAt column to users table
ALTER TABLE users
ADD COLUMN created_at TIMESTAMP;

-- Add CreatedAt, StartedAt, CompletedAt columns to jobs table
ALTER TABLE jobs
ADD COLUMN created_at TIMESTAMP,
ADD COLUMN started_at TIMESTAMP,
ADD COLUMN completed_at TIMESTAMP;
