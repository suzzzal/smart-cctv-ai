import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Camera, 
  MapPin, 
  Clock, 
  TrendingUp,
  Users,
  Shield,
  Car,
  Zap,
  Eye,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useWebSocket } from '../contexts/WebSocketContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeFeeds: 0,
    incidentsToday: 0,
    avgResponseTime: 0
  });
  
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [incidentTrends, setIncidentTrends] = useState([]);
  const [feedStatus, setFeedStatus] = useState([]);
  const { socket } = useWebSocket();

  useEffect(() => {
    fetchDashboardData();
    
    if (socket) {
      socket.on('incident_detected', (incident) => {
        toast.success(`New ${incident.incident_type} incident detected!`);
        fetchDashboardData();
      });
      
      socket.on('feed_status_update', (status) => {
        setFeedStatus(prev => 
          prev.map(feed => 
            feed.id === status.feed_id 
              ? { ...feed, status: status.status }
              : feed
          )
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('incident_detected');
        socket.off('feed_status_update');
      }
    };
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, incidentsRes, trendsRes, feedsRes] = await Promise.all([
        fetch('/api/stats/incidents'),
        fetch('/api/incidents/?limit=10'),
        fetch('/api/stats/incidents?days=7'),
        fetch('/api/feeds/')
      ]);

      const statsData = await statsRes.json();
      const incidentsData = await incidentsRes.json();
      const trendsData = await trendsRes.json();
      const feedsData = await feedsRes.json();

      setStats({
        totalIncidents: statsData.total || 0,
        activeFeeds: feedsData.filter(feed => feed.is_active).length,
        incidentsToday: incidentsData.filter(incident => 
          new Date(incident.created_at).toDateString() === new Date().toDateString()
        ).length,
        avgResponseTime: statsData.avg_response_time || 0
      });

      setRecentIncidents(incidentsData);
      setIncidentTrends(trendsData.incident_types || []);
      setFeedStatus(feedsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const getIncidentIcon = (type) => {
    switch (type) {
      case 'traffic_violation': return <Car className="w-5 h-5" />;
      case 'crime': return <Shield className="w-5 h-5" />;
      case 'civic_issue': return <AlertTriangle className="w-5 h-5" />;
      case 'emergency': return <Zap className="w-5 h-5" />;
      default: return <Eye className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CCTV AI Monitor</h1>
              <p className="text-gray-600">Real-time incident detection and monitoring</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-500">
                <Bell className="w-4 h-4 mr-2" />
                Live Monitoring Active
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalIncidents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Camera className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Feeds</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeFeeds}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.incidentsToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}m</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Incident Trends Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Trends (7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incidentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Incident Types Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incident Types</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incidentTrends}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {incidentTrends.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Incidents */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Incidents</h3>
            </div>
            <div className="divide-y">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getIncidentIcon(incident.incident_type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {incident.incident_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">{incident.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(incident.created_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mr-1" />
                    {incident.location || 'Unknown location'}
                    <Clock className="w-4 h-4 ml-4 mr-1" />
                    Confidence: {(incident.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feed Status */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Feed Status</h3>
            </div>
            <div className="p-6">
              {feedStatus.map((feed) => (
                <div key={feed.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{feed.name}</p>
                    <p className="text-sm text-gray-600">{feed.location}</p>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      feed.is_active ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-600">
                      {feed.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
