from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="operator")  # admin, operator, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    created_feeds = relationship("CCTVFeed", back_populates="creator")
    acknowledged_incidents = relationship("Incident", back_populates="acknowledger")

class CCTVFeed(Base):
    __tablename__ = "cctv_feeds"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    stream_url = Column(String(500), nullable=False)
    location = Column(String(200), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    creator = relationship("User", back_populates="created_feeds")
    incidents = relationship("Incident", back_populates="feed")

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_type = Column(String(50), nullable=False)  # traffic_violation, crime, civic_issue, emergency
    sub_type = Column(String(100))  # wrong_way_driving, signal_jumping, fight, fire, etc.
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    confidence = Column(Float, nullable=False)  # AI confidence score 0-1
    description = Column(Text)
    location = Column(String(200))
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Media references
    video_snapshot_path = Column(String(500))
    audio_clip_path = Column(String(500))
    thumbnail_path = Column(String(500))
    
    # Detection metadata
    detection_timestamp = Column(DateTime, nullable=False)
    processing_time_ms = Column(Integer)  # Time taken to process
    
    # Status tracking
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime)
    reported_to_authorities = Column(Boolean, default=False)
    reported_at = Column(DateTime)
    
    # Foreign keys
    feed_id = Column(Integer, ForeignKey("cctv_feeds.id"))
    
    # Additional metadata
    metadata = Column(JSON)  # Store additional detection data
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    feed = relationship("CCTVFeed", back_populates="incidents")
    acknowledger = relationship("User", back_populates="acknowledged_incidents")

class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    notification_type = Column(String(50), nullable=False)  # email, sms, webhook, etc.
    recipient = Column(String(200), nullable=False)
    status = Column(String(20), default="pending")  # pending, sent, failed
    sent_at = Column(DateTime)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    incident = relationship("Incident")

class SystemConfig(Base):
    __tablename__ = "system_config"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    updater = relationship("User")
