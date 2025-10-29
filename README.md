# CCTV AI Monitor 🚨

A comprehensive multimodal AI system for real-time CCTV monitoring and incident detection. This system combines computer vision and audio processing to automatically detect traffic violations, crimes, civic issues, and emergencies, then reports them to appropriate authorities.

## 🌟 Features

### 🚗 Traffic Violation Detection
- Wrong-way driving detection
- Signal jumping (red light violations)
- No helmet detection for motorcycles
- Speed limit violations
- Illegal parking

### 🧨 Crime & Hazard Detection
- Fighting behavior detection
- Fire detection
- Explosion detection
- Theft and suspicious activity
- Weapon detection

### 🛑 Civic Issue Detection
- Roadblocks and obstructions
- Garbage pile detection
- Damaged roads and infrastructure
- Crowd management issues

### 🚑 Emergency Detection
- Accident detection
- Siren sound recognition
- Medical emergency detection
- Natural disaster indicators

### 📊 Dashboard & Management
- Real-time monitoring dashboard
- Incident management system
- CCTV feed management
- Statistics and analytics
- User authentication and roles

### 🔔 Auto-Reporting System
- Email notifications to authorities
- Webhook integrations
- SMS alerts for critical incidents
- Configurable notification rules

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   AI Models    │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (PyTorch)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   Database      │              │
         │              │   (PostgreSQL)  │              │
         │              └─────────────────┘              │
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │   Redis Cache  │              │
         │              │   & Message Q   │              │
         │              └─────────────────┘              │
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│   WebSocket     │                            │   Notification │
│   Real-time     │                            │   Service       │
│   Updates       │                            │   (Email/SMS)   │
└─────────────────┘                            └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git
- At least 8GB RAM
- NVIDIA GPU (recommended for AI processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/cctv-ai-monitor.git
   cd cctv-ai-monitor
   ```

2. **Configure environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the system**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend Dashboard: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

5. **Default login credentials**
   - Username: `admin`
   - Password: `admin123`

## 📋 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://cctv_user:cctv_password@postgres:5432/cctv_monitor` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET_KEY` | JWT signing key | `your-super-secret-jwt-key-change-in-production` |
| `SMTP_SERVER` | Email server | `smtp.gmail.com` |
| `SMTP_USERNAME` | Email username | - |
| `SMTP_PASSWORD` | Email password | - |

### CCTV Feed Configuration

1. **Add CCTV Feeds**
   - Navigate to Feed Management in the dashboard
   - Click "Add Feed"
   - Enter stream URL (RTSP, HTTP, or file path)
   - Set location coordinates
   - Configure detection settings

2. **Supported Stream Formats**
   - RTSP streams
   - HTTP/HTTPS video streams
   - Local video files
   - IP camera feeds

### Authority Notification Setup

1. **Email Notifications**
   ```bash
   # Configure SMTP settings in .env
   SMTP_SERVER=smtp.gmail.com
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

2. **Webhook Integrations**
   ```bash
   # Configure webhook URLs
   POLICE_WEBHOOK_URL=https://api.police.gov/webhook/incidents
   FIRE_DEPARTMENT_WEBHOOK_URL=https://api.fire.gov/webhook/emergencies
   ```

3. **SMS Alerts**
   ```bash
   # Configure SMS service
   SMS_API_KEY=your-sms-api-key
   EMERGENCY_SMS_CONTACTS=+1234567890,+0987654321
   ```

## 🔧 Development

### Local Development Setup

1. **Backend Development**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Frontend Development**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up postgres redis -d
   
   # Run migrations
   alembic upgrade head
   ```

### AI Model Training

1. **Prepare Training Data**
   ```bash
   # Organize your training data
   mkdir -p training_data/{traffic_violations,crimes,emergencies,civic_issues}
   ```

2. **Train Custom Models**
   ```bash
   cd ai-models
   python train_multimodal_model.py --data-path ../training_data
   ```

3. **Model Evaluation**
   ```bash
   python evaluate_model.py --model-path ./models/best_model.pth
   ```

## 📊 API Documentation

### Authentication
All API endpoints require authentication via JWT tokens.

```bash
# Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/incidents/"
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/feeds/` | GET | List all CCTV feeds |
| `/api/feeds/` | POST | Create new CCTV feed |
| `/api/incidents/` | GET | List incidents with filtering |
| `/api/incidents/{id}` | GET | Get specific incident |
| `/api/process/video` | POST | Process video file |
| `/api/stats/incidents` | GET | Get incident statistics |
| `/ws/{feed_id}` | WebSocket | Real-time feed updates |

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Test Data
The system includes sample data for testing:
- 3 sample CCTV feeds
- Sample incidents of different types
- Test user accounts

## 🚀 Deployment

### Production Deployment

1. **Configure Production Environment**
   ```bash
   # Update docker-compose.yml for production
   # Set proper environment variables
   # Configure SSL certificates
   ```

2. **Deploy with Docker Swarm**
   ```bash
   docker stack deploy -c docker-compose.yml cctv-monitor
   ```

3. **Deploy on Kubernetes**
   ```bash
   kubectl apply -f k8s/
   ```

### Scaling

- **Horizontal Scaling**: Add more backend instances
- **AI Processing**: Use GPU-enabled nodes for AI workloads
- **Database**: Configure read replicas for better performance
- **Caching**: Implement Redis clustering

## 🔒 Security

### Security Features
- JWT-based authentication
- Role-based access control
- Rate limiting
- Input validation
- SQL injection prevention
- CORS configuration
- Security headers

### Security Best Practices
1. Change default passwords
2. Use HTTPS in production
3. Regularly update dependencies
4. Monitor system logs
5. Implement backup strategies
6. Use strong JWT secrets

## 📈 Monitoring

### Health Checks
- API health endpoint: `/health`
- Database connectivity
- Redis connectivity
- AI model status

### Metrics
- Incident detection rate
- Processing latency
- System resource usage
- Error rates

### Logging
- Structured logging with JSON format
- Log rotation and retention
- Error tracking and alerting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint for JavaScript
- Write comprehensive tests
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](http://localhost:8000/docs)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)

### Community
- [GitHub Issues](https://github.com/your-username/cctv-ai-monitor/issues)
- [Discord Community](https://discord.gg/cctv-monitor)
- [Email Support](mailto:support@cctv-monitor.com)

### Troubleshooting

**Common Issues:**

1. **AI Models Not Loading**
   ```bash
   # Check GPU availability
   nvidia-smi
   
   # Verify model files
   ls -la ai-models/
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose ps postgres
   
   # View database logs
   docker-compose logs postgres
   ```

3. **Video Stream Issues**
   ```bash
   # Test stream connectivity
   ffprobe your-stream-url
   
   # Check firewall settings
   ```

## 🎯 Roadmap

### Upcoming Features
- [ ] Mobile app for field officers
- [ ] Advanced analytics dashboard
- [ ] Integration with traffic management systems
- [ ] Multi-language support
- [ ] Cloud deployment options
- [ ] Advanced AI model training tools

### Version History
- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Enhanced AI models and performance improvements
- **v1.2.0**: Mobile app and advanced analytics

---

**Built with ❤️ for safer communities**
