#!/bin/bash

# CCTV AI Monitor Startup Script
# This script helps you get started with the CCTV AI Monitor system

set -e

echo "🚨 CCTV AI Monitor Setup Script"
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing"
    echo "   - Set up email SMTP settings"
    echo "   - Configure webhook URLs"
    echo "   - Set JWT secret key"
    echo ""
    read -p "Press Enter after you've configured .env file..."
fi

echo "🔧 Starting services..."

# Create necessary directories
mkdir -p snapshots logs ai-models

# Start the services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check database
if docker-compose exec postgres pg_isready -U cctv_user -d cctv_monitor &> /dev/null; then
    echo "✅ Database is ready"
else
    echo "❌ Database is not ready"
fi

# Check Redis
if docker-compose exec redis redis-cli ping &> /dev/null; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
fi

# Check backend
if curl -f http://localhost:8000/health &> /dev/null; then
    echo "✅ Backend API is ready"
else
    echo "❌ Backend API is not ready"
fi

# Check frontend
if curl -f http://localhost:3000 &> /dev/null; then
    echo "✅ Frontend is ready"
else
    echo "❌ Frontend is not ready"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🌐 Access URLs:"
echo "   Frontend Dashboard: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Documentation: http://localhost:8000/docs"
echo ""
echo "🔑 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📊 Next Steps:"
echo "   1. Log in to the dashboard"
echo "   2. Add your CCTV feeds in Feed Management"
echo "   3. Configure notification settings"
echo "   4. Monitor incidents in real-time"
echo ""
echo "📚 Documentation:"
echo "   README.md - Complete setup and usage guide"
echo "   http://localhost:8000/docs - API documentation"
echo ""
echo "🛠️  Useful Commands:"
echo "   docker-compose logs -f          # View all logs"
echo "   docker-compose logs -f backend # View backend logs"
echo "   docker-compose down            # Stop all services"
echo "   docker-compose restart         # Restart all services"
echo ""
echo "Happy monitoring! 🚨"
