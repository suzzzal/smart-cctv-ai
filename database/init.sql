-- Database initialization script for CCTV AI Monitor
-- This script creates the initial database schema and inserts sample data

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS cctv_monitor;

-- Use the database
\c cctv_monitor;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'operator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create CCTV feeds table
CREATE TABLE IF NOT EXISTS cctv_feeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    stream_url VARCHAR(500) NOT NULL,
    location VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(50) NOT NULL,
    sub_type VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'medium',
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    description TEXT,
    location VARCHAR(200),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    video_snapshot_path VARCHAR(500),
    audio_clip_path VARCHAR(500),
    thumbnail_path VARCHAR(500),
    detection_timestamp TIMESTAMP NOT NULL,
    processing_time_ms INTEGER,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    reported_to_authorities BOOLEAN DEFAULT FALSE,
    reported_at TIMESTAMP,
    feed_id INTEGER REFERENCES cctv_feeds(id),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id),
    notification_type VARCHAR(50) NOT NULL,
    recipient VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system config table
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(detection_timestamp);
CREATE INDEX IF NOT EXISTS idx_incidents_feed_id ON incidents(feed_id);
CREATE INDEX IF NOT EXISTS idx_incidents_acknowledged ON incidents(acknowledged);
CREATE INDEX IF NOT EXISTS idx_feeds_active ON cctv_feeds(is_active);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, hashed_password, full_name, role) 
VALUES (
    'admin', 
    'admin@cctv-monitor.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8QZ8K2', -- admin123
    'System Administrator', 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Insert sample CCTV feeds
INSERT INTO cctv_feeds (name, stream_url, location, latitude, longitude, description, created_by) 
VALUES 
    ('Main Street Camera', 'rtsp://demo:demo@ipv4.camera.stream:554/stream', 'Main Street Intersection', 40.7128, -74.0060, 'Primary traffic monitoring camera', 1),
    ('Park Entrance', 'rtsp://demo:demo@ipv4.camera.stream:554/stream2', 'Central Park Entrance', 40.7829, -73.9654, 'Park security monitoring', 1),
    ('Shopping Mall', 'rtsp://demo:demo@ipv4.camera.stream:554/stream3', 'Downtown Shopping Mall', 40.7589, -73.9851, 'Mall security and crowd monitoring', 1)
ON CONFLICT DO NOTHING;

-- Insert sample incidents
INSERT INTO incidents (incident_type, sub_type, severity, confidence, description, location, latitude, longitude, detection_timestamp, feed_id, metadata) 
VALUES 
    ('traffic_violation', 'signal_jumping', 'medium', 0.85, 'Vehicle detected running red light', 'Main Street Intersection', 40.7128, -74.0060, CURRENT_TIMESTAMP - INTERVAL '2 hours', 1, '{"vehicle_type": "car", "speed": 45}'),
    ('crime', 'theft', 'high', 0.92, 'Suspicious activity detected near park entrance', 'Central Park Entrance', 40.7829, -73.9654, CURRENT_TIMESTAMP - INTERVAL '1 hour', 2, '{"person_count": 2, "duration": 120}'),
    ('emergency', 'fire', 'critical', 0.95, 'Fire detected in shopping mall', 'Downtown Shopping Mall', 40.7589, -73.9851, CURRENT_TIMESTAMP - INTERVAL '30 minutes', 3, '{"fire_intensity": "high", "evacuation_needed": true}')
ON CONFLICT DO NOTHING;

-- Insert system configuration
INSERT INTO system_config (key, value, description, updated_by) 
VALUES 
    ('detection_threshold_traffic', '0.7', 'Confidence threshold for traffic violations', 1),
    ('detection_threshold_crime', '0.8', 'Confidence threshold for crime detection', 1),
    ('detection_threshold_emergency', '0.9', 'Confidence threshold for emergency detection', 1),
    ('notification_email_enabled', 'true', 'Enable email notifications', 1),
    ('notification_sms_enabled', 'false', 'Enable SMS notifications', 1),
    ('auto_report_enabled', 'true', 'Enable automatic reporting to authorities', 1)
ON CONFLICT (key) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cctv_feeds_updated_at BEFORE UPDATE ON cctv_feeds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE cctv_monitor TO cctv_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cctv_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cctv_user;
