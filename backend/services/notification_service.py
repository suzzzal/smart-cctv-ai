import asyncio
import logging
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import Dict, List, Optional
from datetime import datetime
import json
import os
from pathlib import Path

class NotificationService:
    """
    Service for sending notifications about incidents to authorities
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.config = {
            "email": {
                "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
                "smtp_port": int(os.getenv("SMTP_PORT", "587")),
                "username": os.getenv("SMTP_USERNAME", ""),
                "password": os.getenv("SMTP_PASSWORD", ""),
                "from_email": os.getenv("FROM_EMAIL", "cctv-monitor@example.com")
            },
            "webhook": {
                "police_url": os.getenv("POLICE_WEBHOOK_URL", ""),
                "fire_department_url": os.getenv("FIRE_DEPARTMENT_WEBHOOK_URL", ""),
                "traffic_authority_url": os.getenv("TRAFFIC_AUTHORITY_WEBHOOK_URL", ""),
                "municipal_url": os.getenv("MUNICIPAL_WEBHOOK_URL", "")
            },
            "sms": {
                "api_key": os.getenv("SMS_API_KEY", ""),
                "api_url": os.getenv("SMS_API_URL", "")
            }
        }
        
        # Authority contact mapping
        self.authority_mapping = {
            "traffic_violation": {
                "email": ["traffic@city.gov", "police@city.gov"],
                "webhook": "traffic_authority_url",
                "priority": "medium"
            },
            "crime": {
                "email": ["police@city.gov", "emergency@city.gov"],
                "webhook": "police_url",
                "priority": "high"
            },
            "civic_issue": {
                "email": ["municipal@city.gov", "publicworks@city.gov"],
                "webhook": "municipal_url",
                "priority": "low"
            },
            "emergency": {
                "email": ["emergency@city.gov", "fire@city.gov", "police@city.gov"],
                "webhook": "fire_department_url",
                "priority": "critical"
            }
        }
    
    async def initialize(self):
        """Initialize the notification service"""
        self.logger.info("Notification service initialized")
    
    async def send_incident_notification(self, incident: Dict):
        """Send notification about an incident to appropriate authorities"""
        try:
            incident_type = incident["incident_type"]
            severity = incident.get("severity", "medium")
            
            # Get authority configuration
            authority_config = self.authority_mapping.get(incident_type, {})
            
            # Create notification message
            message = await self._create_notification_message(incident)
            
            # Send notifications based on severity and type
            tasks = []
            
            # Always send email for high/critical incidents
            if severity in ["high", "critical"]:
                tasks.append(self._send_email_notification(incident, message))
            
            # Send webhook notification
            if authority_config.get("webhook"):
                tasks.append(self._send_webhook_notification(incident, message))
            
            # Send SMS for critical incidents
            if severity == "critical":
                tasks.append(self._send_sms_notification(incident, message))
            
            # Execute all notifications concurrently
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            
            self.logger.info(f"Notifications sent for incident {incident.get('id', 'unknown')}")
            
        except Exception as e:
            self.logger.error(f"Error sending incident notification: {e}")
    
    async def _create_notification_message(self, incident: Dict) -> str:
        """Create notification message for incident"""
        try:
            incident_type = incident["incident_type"]
            sub_type = incident.get("sub_type", "")
            severity = incident.get("severity", "medium")
            confidence = incident.get("confidence", 0.0)
            description = incident.get("description", "")
            location = incident.get("location", "Unknown location")
            timestamp = incident.get("timestamp", datetime.utcnow())
            
            # Format timestamp
            if isinstance(timestamp, datetime):
                timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
            else:
                timestamp_str = str(timestamp)
            
            message = f"""
🚨 CCTV INCIDENT ALERT 🚨

Incident Type: {incident_type.replace('_', ' ').title()}
Sub Type: {sub_type.replace('_', ' ').title()}
Severity: {severity.upper()}
Confidence: {confidence:.2%}
Location: {location}
Time: {timestamp_str}

Description: {description}

Feed ID: {incident.get('feed_id', 'Unknown')}
Incident ID: {incident.get('id', 'Unknown')}

Please investigate this incident immediately.

---
CCTV AI Monitor System
Generated at: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")}
            """.strip()
            
            return message
            
        except Exception as e:
            self.logger.error(f"Error creating notification message: {e}")
            return f"Incident detected: {incident.get('incident_type', 'Unknown')}"
    
    async def _send_email_notification(self, incident: Dict, message: str):
        """Send email notification"""
        try:
            incident_type = incident["incident_type"]
            authority_config = self.authority_mapping.get(incident_type, {})
            recipients = authority_config.get("email", [])
            
            if not recipients:
                self.logger.warning(f"No email recipients configured for {incident_type}")
                return
            
            # Create email
            msg = MIMEMultipart()
            msg['From'] = self.config["email"]["from_email"]
            msg['To'] = ", ".join(recipients)
            msg['Subject'] = f"CCTV Alert: {incident_type.replace('_', ' ').title()} - {incident.get('severity', 'medium').upper()}"
            
            # Add message body
            msg.attach(MIMEText(message, 'plain'))
            
            # Add image attachment if available
            snapshot_path = incident.get("video_snapshot_path")
            if snapshot_path and os.path.exists(snapshot_path):
                with open(snapshot_path, 'rb') as f:
                    img_data = f.read()
                    image = MIMEImage(img_data)
                    image.add_header('Content-Disposition', f'attachment; filename="{os.path.basename(snapshot_path)}"')
                    msg.attach(image)
            
            # Send email
            server = smtplib.SMTP(self.config["email"]["smtp_server"], self.config["email"]["smtp_port"])
            server.starttls()
            server.login(self.config["email"]["username"], self.config["email"]["password"])
            
            text = msg.as_string()
            server.sendmail(self.config["email"]["from_email"], recipients, text)
            server.quit()
            
            self.logger.info(f"Email notification sent to {recipients}")
            
        except Exception as e:
            self.logger.error(f"Error sending email notification: {e}")
    
    async def _send_webhook_notification(self, incident: Dict, message: str):
        """Send webhook notification"""
        try:
            incident_type = incident["incident_type"]
            authority_config = self.authority_mapping.get(incident_type, {})
            webhook_key = authority_config.get("webhook")
            
            if not webhook_key:
                self.logger.warning(f"No webhook configured for {incident_type}")
                return
            
            webhook_url = self.config["webhook"].get(webhook_key)
            if not webhook_url:
                self.logger.warning(f"Webhook URL not configured for {webhook_key}")
                return
            
            # Prepare webhook payload
            payload = {
                "incident": {
                    "id": incident.get("id"),
                    "type": incident_type,
                    "sub_type": incident.get("sub_type"),
                    "severity": incident.get("severity"),
                    "confidence": incident.get("confidence"),
                    "description": incident.get("description"),
                    "location": incident.get("location"),
                    "latitude": incident.get("latitude"),
                    "longitude": incident.get("longitude"),
                    "timestamp": incident.get("timestamp"),
                    "feed_id": incident.get("feed_id"),
                    "message": message
                },
                "metadata": {
                    "source": "cctv-ai-monitor",
                    "version": "1.0.0",
                    "sent_at": datetime.utcnow().isoformat()
                }
            }
            
            # Send webhook
            response = requests.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                self.logger.info(f"Webhook notification sent to {webhook_url}")
            else:
                self.logger.error(f"Webhook notification failed: {response.status_code} - {response.text}")
            
        except Exception as e:
            self.logger.error(f"Error sending webhook notification: {e}")
    
    async def _send_sms_notification(self, incident: Dict, message: str):
        """Send SMS notification"""
        try:
            sms_config = self.config["sms"]
            if not sms_config["api_key"] or not sms_config["api_url"]:
                self.logger.warning("SMS configuration not available")
                return
            
            # Get emergency contacts
            emergency_contacts = os.getenv("EMERGENCY_SMS_CONTACTS", "").split(",")
            emergency_contacts = [contact.strip() for contact in emergency_contacts if contact.strip()]
            
            if not emergency_contacts:
                self.logger.warning("No emergency SMS contacts configured")
                return
            
            # Prepare SMS payload
            sms_payload = {
                "api_key": sms_config["api_key"],
                "to": emergency_contacts,
                "message": message[:160],  # SMS character limit
                "priority": "high"
            }
            
            # Send SMS
            response = requests.post(
                sms_config["api_url"],
                json=sms_payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                self.logger.info(f"SMS notification sent to {emergency_contacts}")
            else:
                self.logger.error(f"SMS notification failed: {response.status_code} - {response.text}")
            
        except Exception as e:
            self.logger.error(f"Error sending SMS notification: {e}")
    
    async def send_test_notification(self, notification_type: str = "email"):
        """Send test notification to verify configuration"""
        try:
            test_incident = {
                "id": "test",
                "incident_type": "emergency",
                "sub_type": "test",
                "severity": "medium",
                "confidence": 0.95,
                "description": "This is a test notification from CCTV AI Monitor",
                "location": "Test Location",
                "timestamp": datetime.utcnow(),
                "feed_id": 0
            }
            
            message = await self._create_notification_message(test_incident)
            
            if notification_type == "email":
                await self._send_email_notification(test_incident, message)
            elif notification_type == "webhook":
                await self._send_webhook_notification(test_incident, message)
            elif notification_type == "sms":
                await self._send_sms_notification(test_incident, message)
            
            self.logger.info(f"Test {notification_type} notification sent successfully")
            
        except Exception as e:
            self.logger.error(f"Error sending test notification: {e}")
    
    async def is_healthy(self) -> bool:
        """Check if notification service is healthy"""
        try:
            # Check if required configuration is available
            email_config = self.config["email"]
            return (
                bool(email_config["username"]) and
                bool(email_config["password"]) and
                bool(email_config["from_email"])
            )
        except:
            return False
    
    async def cleanup(self):
        """Cleanup notification service"""
        self.logger.info("Notification service cleaned up")
