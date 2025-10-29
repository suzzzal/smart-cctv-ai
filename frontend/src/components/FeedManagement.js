import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Camera, 
  MapPin, 
  Play, 
  Pause, 
  Settings, 
  Trash2,
  Edit,
  Eye,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const FeedManagement = () => {
  const [feeds, setFeeds] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);
  const [loading, setLoading] = useState(false);

  const [newFeed, setNewFeed] = useState({
    name: '',
    stream_url: '',
    location: '',
    latitude: '',
    longitude: '',
    description: ''
  });

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      const response = await fetch('/api/feeds/');
      const data = await response.json();
      setFeeds(data);
    } catch (error) {
      console.error('Error fetching feeds:', error);
      toast.error('Failed to load feeds');
    }
  };

  const handleAddFeed = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/feeds/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFeed),
      });

      if (response.ok) {
        toast.success('Feed added successfully');
        setIsAddModalOpen(false);
        setNewFeed({
          name: '',
          stream_url: '',
          location: '',
          latitude: '',
          longitude: '',
          description: ''
        });
        fetchFeeds();
      } else {
        throw new Error('Failed to add feed');
      }
    } catch (error) {
      console.error('Error adding feed:', error);
      toast.error('Failed to add feed');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFeed = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/feeds/${editingFeed.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingFeed),
      });

      if (response.ok) {
        toast.success('Feed updated successfully');
        setIsEditModalOpen(false);
        setEditingFeed(null);
        fetchFeeds();
      } else {
        throw new Error('Failed to update feed');
      }
    } catch (error) {
      console.error('Error updating feed:', error);
      toast.error('Failed to update feed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeed = async (feedId) => {
    if (!window.confirm('Are you sure you want to delete this feed?')) {
      return;
    }

    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Feed deleted successfully');
        fetchFeeds();
      } else {
        throw new Error('Failed to delete feed');
      }
    } catch (error) {
      console.error('Error deleting feed:', error);
      toast.error('Failed to delete feed');
    }
  };

  const toggleFeedStatus = async (feedId, currentStatus) => {
    try {
      const response = await fetch(`/api/feeds/${feedId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        toast.success(`Feed ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchFeeds();
      } else {
        throw new Error('Failed to toggle feed status');
      }
    } catch (error) {
      console.error('Error toggling feed status:', error);
      toast.error('Failed to toggle feed status');
    }
  };

  const openEditModal = (feed) => {
    setEditingFeed({ ...feed });
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feed Management</h1>
              <p className="text-gray-600">Manage CCTV feeds and monitoring settings</p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Feed
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feeds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feeds.map((feed) => (
            <div key={feed.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Feed Preview */}
              <div className="aspect-video bg-gray-200 relative">
                {feed.is_active ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Live Feed</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Feed Inactive</p>
                    </div>
                  </div>
                )}
                
                {/* Status Indicator */}
                <div className="absolute top-2 right-2">
                  <div className={`w-3 h-3 rounded-full ${
                    feed.is_active ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
              </div>

              {/* Feed Info */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feed.name}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  {feed.location}
                </div>
                {feed.description && (
                  <p className="text-sm text-gray-600 mb-4">{feed.description}</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleFeedStatus(feed.id, feed.is_active)}
                      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-md ${
                        feed.is_active
                          ? 'text-red-700 bg-red-100 hover:bg-red-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      }`}
                    >
                      {feed.is_active ? (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Start
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => openEditModal(feed)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {feeds.length === 0 && (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feeds configured</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first CCTV feed</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Feed
            </button>
          </div>
        )}
      </div>

      {/* Add Feed Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Feed</h3>
              <form onSubmit={handleAddFeed}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Feed Name</label>
                    <input
                      type="text"
                      required
                      value={newFeed.name}
                      onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stream URL</label>
                    <input
                      type="url"
                      required
                      value={newFeed.stream_url}
                      onChange={(e) => setNewFeed({ ...newFeed, stream_url: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      required
                      value={newFeed.location}
                      onChange={(e) => setNewFeed({ ...newFeed, location: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={newFeed.latitude}
                        onChange={(e) => setNewFeed({ ...newFeed, latitude: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={newFeed.longitude}
                        onChange={(e) => setNewFeed({ ...newFeed, longitude: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newFeed.description}
                      onChange={(e) => setNewFeed({ ...newFeed, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Feed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Feed Modal */}
      {isEditModalOpen && editingFeed && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Feed</h3>
              <form onSubmit={handleEditFeed}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Feed Name</label>
                    <input
                      type="text"
                      required
                      value={editingFeed.name}
                      onChange={(e) => setEditingFeed({ ...editingFeed, name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stream URL</label>
                    <input
                      type="url"
                      required
                      value={editingFeed.stream_url}
                      onChange={(e) => setEditingFeed({ ...editingFeed, stream_url: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      required
                      value={editingFeed.location}
                      onChange={(e) => setEditingFeed({ ...editingFeed, location: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={editingFeed.latitude || ''}
                        onChange={(e) => setEditingFeed({ ...editingFeed, latitude: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={editingFeed.longitude || ''}
                        onChange={(e) => setEditingFeed({ ...editingFeed, longitude: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={editingFeed.description || ''}
                      onChange={(e) => setEditingFeed({ ...editingFeed, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Feed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedManagement;
