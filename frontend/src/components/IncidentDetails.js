import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Camera, 
  Download, 
  Share2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const IncidentDetails = () => {
  const { id } = useParams();
  const [incident, setIncident] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchIncidentDetails();
  }, [id]);

  const fetchIncidentDetails = async () => {
    try {
      const response = await fetch(`/api/incidents/${id}`);
      const data = await response.json();
      setIncident(data);
    } catch (error) {
      console.error('Error fetching incident details:', error);
      toast.error('Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      const response = await fetch(`/api/incidents/${id}/acknowledge`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Incident acknowledged');
        fetchIncidentDetails();
      } else {
        throw new Error('Failed to acknowledge incident');
      }
    } catch (error) {
      console.error('Error acknowledging incident:', error);
      toast.error('Failed to acknowledge incident');
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

  const getIncidentIcon = (type) => {
    switch (type) {
      case 'traffic_violation': return <Camera className="w-6 h-6" />;
      case 'crime': return <AlertTriangle className="w-6 h-6" />;
      case 'civic_issue': return <MapPin className="w-6 h-6" />;
      case 'emergency': return <XCircle className="w-6 h-6" />;
      default: return <AlertTriangle className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Incident not found</h3>
          <p className="text-gray-600">The requested incident could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => window.history.back()}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg mr-4">
                {getIncidentIcon(incident.incident_type)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {incident.incident_type.replace('_', ' ').toUpperCase()}
                </h1>
                <p className="text-gray-600">Incident #{incident.id}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center space-x-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getSeverityColor(incident.severity)}`}>
                {incident.severity}
              </span>
              <span className="text-sm text-gray-500">
                Confidence: {(incident.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Incident Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {incident.incident_type.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sub Type</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {incident.sub_type?.replace('_', ' ').toUpperCase() || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {incident.description || 'No description available'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {incident.location || 'Unknown location'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Detection Time</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {format(new Date(incident.detection_timestamp), 'PPP p')}
                  </p>
                </div>
              </div>
            </div>

            {/* Media */}
            {(incident.video_snapshot_path || incident.thumbnail_path) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Media Evidence</h2>
                <div className="space-y-4">
                  {incident.video_snapshot_path && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Video Snapshot</label>
                      <div className="relative">
                        <img
                          src={incident.video_snapshot_path}
                          alt="Incident snapshot"
                          className="w-full h-64 object-cover rounded-lg"
                        />
                        <button className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {incident.thumbnail_path && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail</label>
                      <img
                        src={incident.thumbnail_path}
                        alt="Incident thumbnail"
                        className="w-32 h-24 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            {incident.metadata && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Detection Metadata</h2>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(incident.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Acknowledged</span>
                  <div className="flex items-center">
                    {incident.acknowledged ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${incident.acknowledged ? 'text-green-600' : 'text-red-600'}`}>
                      {incident.acknowledged ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reported to Authorities</span>
                  <div className="flex items-center">
                    {incident.reported_to_authorities ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${incident.reported_to_authorities ? 'text-green-600' : 'text-red-600'}`}>
                      {incident.reported_to_authorities ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Processing Time</span>
                  <span className="text-sm text-gray-900">
                    {incident.processing_time_ms ? `${incident.processing_time_ms}ms` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {!incident.acknowledged && (
                  <button
                    onClick={handleAcknowledge}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Acknowledge Incident
                  </button>
                )}
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Report
                </button>
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Download className="w-4 h-4 mr-2" />
                  Download Evidence
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Incident Detected</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(incident.detection_timestamp), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
                {incident.acknowledged_at && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Incident Acknowledged</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(incident.acknowledged_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                )}
                {incident.reported_at && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Reported to Authorities</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(incident.reported_at), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
