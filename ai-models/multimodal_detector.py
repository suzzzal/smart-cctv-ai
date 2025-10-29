import torch
import torch.nn as nn
import torchvision.transforms as transforms
from transformers import AutoModel, AutoTokenizer
import cv2
import numpy as np
import librosa
import soundfile as sf
from PIL import Image
import logging
from typing import List, Dict, Tuple, Optional
import asyncio
from datetime import datetime
import json

class MultimodalDetector:
    """
    Multimodal AI model for detecting incidents from CCTV feeds
    Combines computer vision and audio processing
    """
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.logger = logging.getLogger(__name__)
        
        # Initialize models
        self.video_model = None
        self.audio_model = None
        self.fusion_model = None
        
        # Detection thresholds
        self.thresholds = {
            "traffic_violation": 0.7,
            "crime": 0.8,
            "civic_issue": 0.6,
            "emergency": 0.9
        }
        
        # Image preprocessing
        self.image_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
        
    async def initialize(self):
        """Initialize all AI models"""
        try:
            await self._load_video_model()
            await self._load_audio_model()
            await self._load_fusion_model()
            self.logger.info("Multimodal detector initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize multimodal detector: {e}")
            raise
    
    async def _load_video_model(self):
        """Load computer vision model for video analysis"""
        try:
            # Using YOLOv8 for object detection and classification
            from ultralytics import YOLO
            
            # Load pre-trained YOLOv8 model
            self.video_model = YOLO('yolov8n.pt')
            
            # Custom classes for our use case
            self.traffic_classes = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'person']
            self.crime_classes = ['person', 'knife', 'gun', 'fire']
            
            self.logger.info("Video model loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load video model: {e}")
            raise
    
    async def _load_audio_model(self):
        """Load audio processing model"""
        try:
            # Using a pre-trained audio classification model
            from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
            
            model_name = "facebook/wav2vec2-base-960h"
            self.audio_model = AutoModelForAudioClassification.from_pretrained(model_name)
            self.audio_feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
            
            self.audio_model.to(self.device)
            self.logger.info("Audio model loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load audio model: {e}")
            raise
    
    async def _load_fusion_model(self):
        """Load multimodal fusion model"""
        try:
            # Simple fusion model combining video and audio features
            class FusionModel(nn.Module):
                def __init__(self, video_dim=1000, audio_dim=768, num_classes=4):
                    super().__init__()
                    self.fusion_layer = nn.Linear(video_dim + audio_dim, 512)
                    self.classifier = nn.Linear(512, num_classes)
                    self.dropout = nn.Dropout(0.3)
                    
                def forward(self, video_features, audio_features):
                    combined = torch.cat([video_features, audio_features], dim=1)
                    fused = torch.relu(self.fusion_layer(combined))
                    fused = self.dropout(fused)
                    return self.classifier(fused)
            
            self.fusion_model = FusionModel()
            self.fusion_model.to(self.device)
            self.logger.info("Fusion model loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load fusion model: {e}")
            raise
    
    async def process_video(self, video_path: str) -> List[Dict]:
        """Process video file and detect incidents"""
        incidents = []
        
        try:
            cap = cv2.VideoCapture(video_path)
            frame_count = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process every 30th frame (1 second at 30fps)
                if frame_count % 30 == 0:
                    incident = await self._analyze_frame(frame, frame_count)
                    if incident:
                        incidents.append(incident)
                
                frame_count += 1
            
            cap.release()
            return incidents
            
        except Exception as e:
            self.logger.error(f"Error processing video: {e}")
            return []
    
    async def process_stream(self, stream_url: str, feed_id: int = None) -> None:
        """Process live video stream"""
        try:
            cap = cv2.VideoCapture(stream_url)
            frame_count = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    await asyncio.sleep(0.1)
                    continue
                
                # Process every 30th frame
                if frame_count % 30 == 0:
                    incident = await self._analyze_frame(frame, frame_count, feed_id)
                    if incident:
                        await self._handle_incident(incident, feed_id)
                
                frame_count += 1
                await asyncio.sleep(0.033)  # ~30fps
                
        except Exception as e:
            self.logger.error(f"Error processing stream: {e}")
    
    async def _analyze_frame(self, frame: np.ndarray, timestamp: int, feed_id: int = None) -> Optional[Dict]:
        """Analyze a single frame for incidents"""
        try:
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Run object detection
            results = self.video_model(rgb_frame)
            
            incidents = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Extract bounding box and confidence
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        class_name = self.video_model.names[class_id]
                        
                        # Check for specific incident types
                        incident = await self._classify_incident(
                            frame, rgb_frame, class_name, confidence, 
                            [x1, y1, x2, y2], timestamp, feed_id
                        )
                        
                        if incident:
                            incidents.append(incident)
            
            return incidents[0] if incidents else None
            
        except Exception as e:
            self.logger.error(f"Error analyzing frame: {e}")
            return None
    
    async def _classify_incident(self, frame: np.ndarray, rgb_frame: np.ndarray, 
                               class_name: str, confidence: float, 
                               bbox: List[float], timestamp: int, 
                               feed_id: int = None) -> Optional[Dict]:
        """Classify detected objects into incident types"""
        
        # Traffic violations
        if class_name in ['car', 'truck', 'bus', 'motorcycle'] and confidence > 0.7:
            # Check for wrong-way driving (simplified heuristic)
            if await self._detect_wrong_way(frame, bbox):
                return {
                    "incident_type": "traffic_violation",
                    "sub_type": "wrong_way_driving",
                    "severity": "high",
                    "confidence": confidence,
                    "description": f"Vehicle detected driving in wrong direction",
                    "bounding_box": bbox,
                    "timestamp": datetime.utcnow(),
                    "feed_id": feed_id,
                    "metadata": {"class": class_name, "frame_timestamp": timestamp}
                }
        
        # Helmet detection for motorcycles
        if class_name == 'motorcycle' and confidence > 0.7:
            if await self._detect_no_helmet(frame, bbox):
                return {
                    "incident_type": "traffic_violation",
                    "sub_type": "no_helmet",
                    "severity": "medium",
                    "confidence": confidence,
                    "description": "Motorcycle rider without helmet detected",
                    "bounding_box": bbox,
                    "timestamp": datetime.utcnow(),
                    "feed_id": feed_id,
                    "metadata": {"class": class_name, "frame_timestamp": timestamp}
                }
        
        # Crime detection
        if class_name == 'person' and confidence > 0.8:
            # Check for fighting behavior
            if await self._detect_fighting(frame, bbox):
                return {
                    "incident_type": "crime",
                    "sub_type": "fight",
                    "severity": "high",
                    "confidence": confidence,
                    "description": "Fighting behavior detected",
                    "bounding_box": bbox,
                    "timestamp": datetime.utcnow(),
                    "feed_id": feed_id,
                    "metadata": {"class": class_name, "frame_timestamp": timestamp}
                }
        
        # Fire detection
        if await self._detect_fire(frame):
            return {
                "incident_type": "emergency",
                "sub_type": "fire",
                "severity": "critical",
                "confidence": 0.9,
                "description": "Fire detected",
                "bounding_box": bbox,
                "timestamp": datetime.utcnow(),
                "feed_id": feed_id,
                "metadata": {"frame_timestamp": timestamp}
            }
        
        return None
    
    async def _detect_wrong_way(self, frame: np.ndarray, bbox: List[float]) -> bool:
        """Detect wrong-way driving using motion analysis"""
        # Simplified implementation - in practice, you'd use optical flow
        # or track vehicle movement over multiple frames
        return False  # Placeholder
    
    async def _detect_no_helmet(self, frame: np.ndarray, bbox: List[float]) -> bool:
        """Detect if motorcycle rider is wearing helmet"""
        # Extract person region and check for helmet
        x1, y1, x2, y2 = map(int, bbox)
        person_region = frame[y1:y2, x1:x2]
        
        # Use head detection to check for helmet
        # This is a simplified implementation
        return False  # Placeholder
    
    async def _detect_fighting(self, frame: np.ndarray, bbox: List[float]) -> bool:
        """Detect fighting behavior"""
        # Analyze pose estimation and motion patterns
        # This would require pose estimation models
        return False  # Placeholder
    
    async def _detect_fire(self, frame: np.ndarray) -> bool:
        """Detect fire in the frame"""
        # Convert to HSV for better color detection
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Define range for fire colors (red/orange)
        lower_fire = np.array([0, 50, 50])
        upper_fire = np.array([20, 255, 255])
        
        # Create mask
        mask = cv2.inRange(hsv, lower_fire, upper_fire)
        
        # Count fire-colored pixels
        fire_pixels = cv2.countNonZero(mask)
        total_pixels = frame.shape[0] * frame.shape[1]
        
        # If more than 1% of pixels are fire-colored, consider it fire
        return (fire_pixels / total_pixels) > 0.01
    
    async def process_audio(self, audio_path: str) -> List[Dict]:
        """Process audio file for incident detection"""
        incidents = []
        
        try:
            # Load audio file
            audio, sr = librosa.load(audio_path, sr=16000)
            
            # Extract features
            features = self.audio_feature_extractor(audio, sampling_rate=sr, return_tensors="pt")
            
            # Run inference
            with torch.no_grad():
                outputs = self.audio_model(**features)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
            
            # Check for emergency sounds (sirens, explosions, etc.)
            if await self._detect_emergency_sounds(audio, sr):
                incidents.append({
                    "incident_type": "emergency",
                    "sub_type": "emergency_sound",
                    "severity": "high",
                    "confidence": 0.8,
                    "description": "Emergency sound detected",
                    "timestamp": datetime.utcnow(),
                    "metadata": {"audio_path": audio_path}
                })
            
            return incidents
            
        except Exception as e:
            self.logger.error(f"Error processing audio: {e}")
            return []
    
    async def _detect_emergency_sounds(self, audio: np.ndarray, sr: int) -> bool:
        """Detect emergency sounds like sirens, explosions"""
        # Analyze frequency content for siren patterns
        # This is a simplified implementation
        
        # Check for high-frequency content (sirens)
        fft = np.fft.fft(audio)
        freqs = np.fft.fftfreq(len(audio), 1/sr)
        
        # Look for frequencies typical of sirens (800-2000 Hz)
        siren_range = (freqs >= 800) & (freqs <= 2000)
        siren_power = np.sum(np.abs(fft[siren_range]))
        total_power = np.sum(np.abs(fft))
        
        return (siren_power / total_power) > 0.1
    
    async def _handle_incident(self, incident: Dict, feed_id: int = None):
        """Handle detected incident"""
        try:
            # Save video snapshot
            if "bounding_box" in incident:
                snapshot_path = await self._save_snapshot(incident)
                incident["video_snapshot_path"] = snapshot_path
            
            # Log incident
            self.logger.info(f"Incident detected: {incident['incident_type']} - {incident['sub_type']}")
            
            # Send to notification service
            from services.notification_service import NotificationService
            notification_service = NotificationService()
            await notification_service.send_incident_notification(incident)
            
        except Exception as e:
            self.logger.error(f"Error handling incident: {e}")
    
    async def _save_snapshot(self, incident: Dict) -> str:
        """Save video snapshot of incident"""
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"incident_{incident['incident_type']}_{timestamp}.jpg"
            filepath = f"snapshots/{filename}"
            
            # Create directory if it doesn't exist
            import os
            os.makedirs("snapshots", exist_ok=True)
            
            # Save snapshot (this would be implemented based on your video capture method)
            # For now, return a placeholder path
            return filepath
            
        except Exception as e:
            self.logger.error(f"Error saving snapshot: {e}")
            return ""
    
    async def is_healthy(self) -> bool:
        """Check if the detector is healthy"""
        try:
            return (
                self.video_model is not None and
                self.audio_model is not None and
                self.fusion_model is not None
            )
        except:
            return False
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            self.logger.info("Multimodal detector cleaned up")
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")
