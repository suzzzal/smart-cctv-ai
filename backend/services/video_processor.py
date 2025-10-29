import cv2
import asyncio
import logging
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
import os
import json
from ai_models.multimodal_detector import MultimodalDetector
from database.database import get_db
from database.models import Incident, CCTVFeed
from sqlalchemy.orm import Session

class VideoProcessor:
    """
    Service for processing video streams and files
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.detector = MultimodalDetector()
        self.active_streams: Dict[int, asyncio.Task] = {}
        self.processing_stats = {
            "frames_processed": 0,
            "incidents_detected": 0,
            "active_streams": 0
        }
    
    async def initialize(self):
        """Initialize the video processor"""
        await self.detector.initialize()
        self.logger.info("Video processor initialized")
    
    async def process_feed(self, feed_id: int, stream_url: str):
        """Start processing a CCTV feed"""
        try:
            if feed_id in self.active_streams:
                self.logger.warning(f"Feed {feed_id} is already being processed")
                return
            
            # Create processing task
            task = asyncio.create_task(
                self._process_stream(feed_id, stream_url)
            )
            self.active_streams[feed_id] = task
            self.processing_stats["active_streams"] = len(self.active_streams)
            
            self.logger.info(f"Started processing feed {feed_id}")
            
        except Exception as e:
            self.logger.error(f"Error starting feed processing: {e}")
    
    async def stop_feed(self, feed_id: int):
        """Stop processing a CCTV feed"""
        try:
            if feed_id in self.active_streams:
                task = self.active_streams[feed_id]
                task.cancel()
                del self.active_streams[feed_id]
                self.processing_stats["active_streams"] = len(self.active_streams)
                self.logger.info(f"Stopped processing feed {feed_id}")
        except Exception as e:
            self.logger.error(f"Error stopping feed processing: {e}")
    
    async def _process_stream(self, feed_id: int, stream_url: str):
        """Process a video stream"""
        cap = None
        frame_count = 0
        last_incident_time = datetime.utcnow()
        
        try:
            # Open video stream
            cap = cv2.VideoCapture(stream_url)
            
            if not cap.isOpened():
                self.logger.error(f"Failed to open stream: {stream_url}")
                return
            
            self.logger.info(f"Processing stream for feed {feed_id}")
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    self.logger.warning(f"Failed to read frame from feed {feed_id}")
                    await asyncio.sleep(1)
                    continue
                
                frame_count += 1
                self.processing_stats["frames_processed"] += 1
                
                # Process every 30th frame (1 second at 30fps)
                if frame_count % 30 == 0:
                    try:
                        incidents = await self._analyze_frame(frame, feed_id, frame_count)
                        
                        if incidents:
                            for incident in incidents:
                                await self._save_incident(incident, feed_id)
                                self.processing_stats["incidents_detected"] += 1
                                last_incident_time = datetime.utcnow()
                        
                    except Exception as e:
                        self.logger.error(f"Error analyzing frame: {e}")
                
                # Check for stream health
                if (datetime.utcnow() - last_incident_time).seconds > 300:  # 5 minutes
                    self.logger.warning(f"No activity detected in feed {feed_id} for 5 minutes")
                
                await asyncio.sleep(0.033)  # ~30fps
                
        except asyncio.CancelledError:
            self.logger.info(f"Stream processing cancelled for feed {feed_id}")
        except Exception as e:
            self.logger.error(f"Error processing stream: {e}")
        finally:
            if cap:
                cap.release()
            if feed_id in self.active_streams:
                del self.active_streams[feed_id]
                self.processing_stats["active_streams"] = len(self.active_streams)
    
    async def _analyze_frame(self, frame: np.ndarray, feed_id: int, frame_count: int) -> List[Dict]:
        """Analyze a frame for incidents"""
        try:
            # Use the multimodal detector to analyze the frame
            incident = await self.detector._analyze_frame(frame, frame_count, feed_id)
            
            if incident:
                return [incident]
            return []
            
        except Exception as e:
            self.logger.error(f"Error analyzing frame: {e}")
            return []
    
    async def _save_incident(self, incident: Dict, feed_id: int):
        """Save incident to database"""
        try:
            # Get database session
            db = next(get_db())
            
            # Create incident record
            incident_record = Incident(
                incident_type=incident["incident_type"],
                sub_type=incident["sub_type"],
                severity=incident["severity"],
                confidence=incident["confidence"],
                description=incident.get("description", ""),
                location=incident.get("location", ""),
                latitude=incident.get("latitude"),
                longitude=incident.get("longitude"),
                video_snapshot_path=incident.get("video_snapshot_path"),
                audio_clip_path=incident.get("audio_clip_path"),
                thumbnail_path=incident.get("thumbnail_path"),
                detection_timestamp=incident["timestamp"],
                processing_time_ms=incident.get("processing_time_ms"),
                feed_id=feed_id,
                metadata=incident.get("metadata", {})
            )
            
            db.add(incident_record)
            db.commit()
            db.refresh(incident_record)
            
            self.logger.info(f"Saved incident {incident_record.id} for feed {feed_id}")
            
            # Send notification
            await self._send_notification(incident_record)
            
        except Exception as e:
            self.logger.error(f"Error saving incident: {e}")
        finally:
            db.close()
    
    async def _send_notification(self, incident: Incident):
        """Send notification about the incident"""
        try:
            from services.notification_service import NotificationService
            notification_service = NotificationService()
            
            await notification_service.send_incident_notification({
                "id": incident.id,
                "incident_type": incident.incident_type,
                "sub_type": incident.sub_type,
                "severity": incident.severity,
                "confidence": incident.confidence,
                "description": incident.description,
                "location": incident.location,
                "timestamp": incident.detection_timestamp,
                "feed_id": incident.feed_id
            })
            
        except Exception as e:
            self.logger.error(f"Error sending notification: {e}")
    
    async def process_video_file(self, file_path: str, feed_id: Optional[int] = None) -> List[Dict]:
        """Process a video file for incidents"""
        try:
            incidents = await self.detector.process_video(file_path)
            
            # Save incidents to database if feed_id is provided
            if feed_id and incidents:
                for incident in incidents:
                    await self._save_incident(incident, feed_id)
            
            return incidents
            
        except Exception as e:
            self.logger.error(f"Error processing video file: {e}")
            return []
    
    async def process_audio_file(self, file_path: str, feed_id: Optional[int] = None) -> List[Dict]:
        """Process an audio file for incidents"""
        try:
            incidents = await self.detector.process_audio(file_path)
            
            # Save incidents to database if feed_id is provided
            if feed_id and incidents:
                for incident in incidents:
                    await self._save_incident(incident, feed_id)
            
            return incidents
            
        except Exception as e:
            self.logger.error(f"Error processing audio file: {e}")
            return []
    
    def get_processing_stats(self) -> Dict:
        """Get current processing statistics"""
        return {
            **self.processing_stats,
            "active_feeds": list(self.active_streams.keys()),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_feed_status(self, feed_id: int) -> Dict:
        """Get status of a specific feed"""
        is_processing = feed_id in self.active_streams
        
        return {
            "feed_id": feed_id,
            "is_processing": is_processing,
            "status": "active" if is_processing else "inactive",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def cleanup(self):
        """Cleanup all active streams"""
        try:
            # Cancel all active streams
            for feed_id, task in self.active_streams.items():
                task.cancel()
                self.logger.info(f"Cancelled processing for feed {feed_id}")
            
            self.active_streams.clear()
            self.processing_stats["active_streams"] = 0
            
            # Cleanup detector
            await self.detector.cleanup()
            
            self.logger.info("Video processor cleaned up")
            
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
    
    async def is_healthy(self) -> bool:
        """Check if the video processor is healthy"""
        try:
            return await self.detector.is_healthy()
        except:
            return False
