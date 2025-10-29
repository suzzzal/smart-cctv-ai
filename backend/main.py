from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio
import json
import logging
from datetime import datetime
import os
from pathlib import Path

from database.models import Incident, CCTVFeed, User
from database.database import get_db, engine
from database.schemas import IncidentCreate, IncidentResponse, CCTVFeedResponse
from ai_models.multimodal_detector import MultimodalDetector
from services.notification_service import NotificationService
from services.video_processor import VideoProcessor
from auth.auth_handler import AuthHandler

# Initialize FastAPI app
app = FastAPI(
    title="CCTV AI Monitor API",
    description="Multimodal AI system for CCTV monitoring and incident detection",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
auth_handler = AuthHandler()
multimodal_detector = MultimodalDetector()
notification_service = NotificationService()
video_processor = VideoProcessor()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.feed_connections: dict = {}

    async def connect(self, websocket: WebSocket, feed_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if feed_id:
            if feed_id not in self.feed_connections:
                self.feed_connections[feed_id] = []
            self.feed_connections[feed_id].append(websocket)

    def disconnect(self, websocket: WebSocket, feed_id: str = None):
        self.active_connections.remove(websocket)
        if feed_id and feed_id in self.feed_connections:
            self.feed_connections[feed_id].remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_feed(self, message: str, feed_id: str):
        if feed_id in self.feed_connections:
            for connection in self.feed_connections[feed_id]:
                try:
                    await connection.send_text(message)
                except:
                    # Remove broken connections
                    self.feed_connections[feed_id].remove(connection)

manager = ConnectionManager()

# Security
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = auth_handler.decode_token(token)
    return payload

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await multimodal_detector.initialize()
    await notification_service.initialize()
    logging.info("CCTV AI Monitor API started")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await multimodal_detector.cleanup()
    await notification_service.cleanup()
    logging.info("CCTV AI Monitor API shutdown")

@app.get("/")
async def root():
    return {"message": "CCTV AI Monitor API", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "ai_model": await multimodal_detector.is_healthy(),
            "notification": await notification_service.is_healthy()
        }
    }

# CCTV Feed Management
@app.post("/api/feeds/", response_model=CCTVFeedResponse)
async def create_cctv_feed(
    feed_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new CCTV feed"""
    try:
        feed = CCTVFeed(
            name=feed_data["name"],
            stream_url=feed_data["stream_url"],
            location=feed_data["location"],
            latitude=feed_data.get("latitude"),
            longitude=feed_data.get("longitude"),
            is_active=True,
            created_by=current_user["user_id"]
        )
        db.add(feed)
        db.commit()
        db.refresh(feed)
        
        # Start processing this feed
        asyncio.create_task(video_processor.process_feed(feed.id, feed.stream_url))
        
        return feed
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/feeds/", response_model=List[CCTVFeedResponse])
async def get_cctv_feeds(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all CCTV feeds"""
    feeds = db.query(CCTVFeed).filter(CCTVFeed.is_active == True).all()
    return feeds

@app.get("/api/feeds/{feed_id}", response_model=CCTVFeedResponse)
async def get_cctv_feed(
    feed_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific CCTV feed"""
    feed = db.query(CCTVFeed).filter(CCTVFeed.id == feed_id).first()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    return feed

# Incident Management
@app.get("/api/incidents/", response_model=List[IncidentResponse])
async def get_incidents(
    skip: int = 0,
    limit: int = 100,
    incident_type: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get incidents with filtering"""
    query = db.query(Incident)
    
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if severity:
        query = query.filter(Incident.severity == severity)
    
    incidents = query.offset(skip).limit(limit).all()
    return incidents

@app.get("/api/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific incident"""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@app.post("/api/incidents/{incident_id}/acknowledge")
async def acknowledge_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Acknowledge an incident"""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident.acknowledged = True
    incident.acknowledged_by = current_user["user_id"]
    incident.acknowledged_at = datetime.utcnow()
    
    db.commit()
    return {"message": "Incident acknowledged"}

# WebSocket for real-time updates
@app.websocket("/ws/{feed_id}")
async def websocket_endpoint(websocket: WebSocket, feed_id: str):
    await manager.connect(websocket, feed_id)
    try:
        while True:
            # Keep connection alive and send periodic updates
            await asyncio.sleep(1)
            await manager.send_personal_message(
                json.dumps({"type": "ping", "timestamp": datetime.utcnow().isoformat()}),
                websocket
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket, feed_id)

# Video Processing Endpoints
@app.post("/api/process/video")
async def process_video_file(
    file: UploadFile = File(...),
    feed_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Process uploaded video file for incidents"""
    try:
        # Save uploaded file temporarily
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process video
        incidents = await multimodal_detector.process_video(temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return {"incidents": incidents, "processed": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/process/stream")
async def process_stream(
    stream_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Process live stream for incidents"""
    try:
        stream_url = stream_data["stream_url"]
        feed_id = stream_data.get("feed_id")
        
        # Start processing stream
        task = asyncio.create_task(
            video_processor.process_stream(stream_url, feed_id)
        )
        
        return {"message": "Stream processing started", "task_id": str(task)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Statistics and Analytics
@app.get("/api/stats/incidents")
async def get_incident_stats(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get incident statistics"""
    from sqlalchemy import func, and_
    from datetime import timedelta
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    stats = db.query(
        Incident.incident_type,
        func.count(Incident.id).label('count'),
        func.avg(Incident.confidence).label('avg_confidence')
    ).filter(
        Incident.created_at >= start_date
    ).group_by(Incident.incident_type).all()
    
    return {
        "period_days": days,
        "incident_types": [
            {
                "type": stat.incident_type,
                "count": stat.count,
                "avg_confidence": float(stat.avg_confidence) if stat.avg_confidence else 0
            }
            for stat in stats
        ]
    }

@app.get("/api/stats/feeds")
async def get_feed_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get feed statistics"""
    total_feeds = db.query(CCTVFeed).count()
    active_feeds = db.query(CCTVFeed).filter(CCTVFeed.is_active == True).count()
    
    return {
        "total_feeds": total_feeds,
        "active_feeds": active_feeds,
        "inactive_feeds": total_feeds - active_feeds
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
