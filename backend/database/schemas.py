from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class IncidentType(str, Enum):
    TRAFFIC_VIOLATION = "traffic_violation"
    CRIME = "crime"
    CIVIC_ISSUE = "civic_issue"
    EMERGENCY = "emergency"

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentCreate(BaseModel):
    incident_type: IncidentType
    sub_type: str
    severity: SeverityLevel = SeverityLevel.MEDIUM
    confidence: float = Field(..., ge=0.0, le=1.0)
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    video_snapshot_path: Optional[str] = None
    audio_clip_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    detection_timestamp: datetime
    processing_time_ms: Optional[int] = None
    feed_id: int
    metadata: Optional[dict] = None

class IncidentResponse(BaseModel):
    id: int
    incident_type: IncidentType
    sub_type: str
    severity: SeverityLevel
    confidence: float
    description: Optional[str]
    location: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    video_snapshot_path: Optional[str]
    audio_clip_path: Optional[str]
    thumbnail_path: Optional[str]
    detection_timestamp: datetime
    processing_time_ms: Optional[int]
    acknowledged: bool
    acknowledged_by: Optional[int]
    acknowledged_at: Optional[datetime]
    reported_to_authorities: bool
    reported_at: Optional[datetime]
    feed_id: int
    metadata: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CCTVFeedCreate(BaseModel):
    name: str
    stream_url: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None

class CCTVFeedResponse(BaseModel):
    id: int
    name: str
    stream_url: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: int

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "operator"

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class NotificationRequest(BaseModel):
    incident_id: int
    notification_type: str
    recipient: str
    message: Optional[str] = None

class StreamProcessingRequest(BaseModel):
    stream_url: str
    feed_id: Optional[int] = None
    processing_options: Optional[dict] = None

class VideoProcessingRequest(BaseModel):
    file_path: str
    feed_id: Optional[int] = None
    processing_options: Optional[dict] = None

class DetectionResult(BaseModel):
    incident_type: IncidentType
    sub_type: str
    confidence: float
    bounding_box: Optional[List[float]] = None
    timestamp: datetime
    metadata: Optional[dict] = None

class ProcessingStatus(BaseModel):
    status: str  # processing, completed, failed
    progress: float = Field(..., ge=0.0, le=1.0)
    message: Optional[str] = None
    results: Optional[List[DetectionResult]] = None
    error: Optional[str] = None
