import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Mail, 
  Phone, 
  Globe,
  Save,
  TestTube,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      webhook: true
    },
    detection: {
      traffic_threshold: 0.7,
      crime_threshold: 0.8,
      emergency_threshold: 0.9,
      civic_threshold: 0.6
    },
    email: {
      smtp_server: '',
      smtp_port: 587,
      username: '',
      password: '',
      from_email: ''
    },
    webhooks: {
      police_url: '',
      fire_department_url: '',
      traffic_authority_url: '',
      municipal_url: ''
    },
    sms: {
      api_key: '',
      api_url: '',
      emergency_contacts: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (type) => {
    setTesting({ ...testing, [type]: true });
    try {
      const response = await fetch(`/api/settings/test/${type}`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success(`${type} test successful`);
      } else {
        throw new Error(`${type} test failed`);
      }
    } catch (error) {
      console.error(`Error testing ${type}:`, error);
      toast.error(`${type} test failed`);
    } finally {
      setTesting({ ...testing, [type]: false });
    }
  };

  const handleChange = (section, key, value) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Configure system settings and notifications</p>
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Bell className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Notification Types</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => handleChange('notifications', 'email', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Email Notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms}
                      onChange={(e) => handleChange('notifications', 'sms', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">SMS Notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.webhook}
                      onChange={(e) => handleChange('notifications', 'webhook', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Webhook Notifications</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Detection Thresholds</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Traffic Violations</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.detection.traffic_threshold}
                      onChange={(e) => handleChange('detection', 'traffic_threshold', parseFloat(e.target.value))}
                      className="w-full mt-1"
                    />
                    <span className="text-sm text-gray-500">{settings.detection.traffic_threshold}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Crime Detection</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.detection.crime_threshold}
                      onChange={(e) => handleChange('detection', 'crime_threshold', parseFloat(e.target.value))}
                      className="w-full mt-1"
                    />
                    <span className="text-sm text-gray-500">{settings.detection.crime_threshold}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Emergency Detection</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.detection.emergency_threshold}
                      onChange={(e) => handleChange('detection', 'emergency_threshold', parseFloat(e.target.value))}
                      className="w-full mt-1"
                    />
                    <span className="text-sm text-gray-500">{settings.detection.emergency_threshold}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Test Notifications</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleTest('email')}
                    disabled={testing.email}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {testing.email ? 'Testing...' : 'Test Email'}
                  </button>
                  <button
                    onClick={() => handleTest('sms')}
                    disabled={testing.sms}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {testing.sms ? 'Testing...' : 'Test SMS'}
                  </button>
                  <button
                    onClick={() => handleTest('webhook')}
                    disabled={testing.webhook}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {testing.webhook ? 'Testing...' : 'Test Webhook'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Email Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Mail className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Email Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">SMTP Server</label>
                  <input
                    type="text"
                    value={settings.email.smtp_server}
                    onChange={(e) => handleChange('email', 'smtp_server', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
                  <input
                    type="number"
                    value={settings.email.smtp_port}
                    onChange={(e) => handleChange('email', 'smtp_port', parseInt(e.target.value))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="587"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={settings.email.username}
                    onChange={(e) => handleChange('email', 'username', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your-email@gmail.com"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={settings.email.password}
                    onChange={(e) => handleChange('email', 'password', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your app password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Email</label>
                  <input
                    type="email"
                    value={settings.email.from_email}
                    onChange={(e) => handleChange('email', 'from_email', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="cctv-monitor@yourdomain.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Globe className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Webhook Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Police Department</label>
                  <input
                    type="url"
                    value={settings.webhooks.police_url}
                    onChange={(e) => handleChange('webhooks', 'police_url', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api.police.gov/webhook/incidents"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fire Department</label>
                  <input
                    type="url"
                    value={settings.webhooks.fire_department_url}
                    onChange={(e) => handleChange('webhooks', 'fire_department_url', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api.fire.gov/webhook/emergencies"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Traffic Authority</label>
                  <input
                    type="url"
                    value={settings.webhooks.traffic_authority_url}
                    onChange={(e) => handleChange('webhooks', 'traffic_authority_url', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api.traffic.gov/webhook/violations"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Municipal Services</label>
                  <input
                    type="url"
                    value={settings.webhooks.municipal_url}
                    onChange={(e) => handleChange('webhooks', 'municipal_url', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api.municipal.gov/webhook/issues"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SMS Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Phone className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">SMS Configuration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <input
                    type="text"
                    value={settings.sms.api_key}
                    onChange={(e) => handleChange('sms', 'api_key', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your SMS API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">API URL</label>
                  <input
                    type="url"
                    value={settings.sms.api_url}
                    onChange={(e) => handleChange('sms', 'api_url', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api.sms-provider.com/send"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Emergency Contacts</label>
                  <textarea
                    value={settings.sms.emergency_contacts}
                    onChange={(e) => handleChange('sms', 'emergency_contacts', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1234567890,+0987654321"
                  />
                  <p className="mt-1 text-sm text-gray-500">Separate multiple contacts with commas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <Shield className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      All sensitive configuration data is encrypted and stored securely. 
                      Make sure to use strong passwords and enable two-factor authentication where possible.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    defaultValue="30"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Login Attempts</label>
                  <input
                    type="number"
                    defaultValue="5"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
