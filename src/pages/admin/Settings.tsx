import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { 
  Bell, 
  Globe, 
  Lock, 
  Mail, 
  Shield, 
  User,
  Save
} from 'lucide-react';

export function Settings() {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      browser: true,
      mobile: false,
    },
    privacy: {
      profileVisibility: 'public',
      activityStatus: true,
      showEmail: false,
    },
    security: {
      twoFactor: false,
      sessionTimeout: '30',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Save settings logic here
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Notifications Settings */}
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-white mr-2" />
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Email Notifications</label>
                <p className="text-gray-400 text-sm">Receive updates via email</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    email: e.target.checked,
                  },
                })}
                className="rounded bg-gray-800 border-gray-700 text-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Browser Notifications</label>
                <p className="text-gray-400 text-sm">Show desktop notifications</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.browser}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: {
                    ...settings.notifications,
                    browser: e.target.checked,
                  },
                })}
                className="rounded bg-gray-800 border-gray-700 text-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-white mr-2" />
            <h2 className="text-xl font-semibold text-white">Privacy</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-white font-medium block mb-2">Profile Visibility</label>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) => setSettings({
                  ...settings,
                  privacy: {
                    ...settings.privacy,
                    profileVisibility: e.target.value,
                  },
                })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="members">Members Only</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Show Activity Status</label>
                <p className="text-gray-400 text-sm">Let others see when you're online</p>
              </div>
              <input
                type="checkbox"
                checked={settings.privacy.activityStatus}
                onChange={(e) => setSettings({
                  ...settings,
                  privacy: {
                    ...settings.privacy,
                    activityStatus: e.target.checked,
                  },
                })}
                className="rounded bg-gray-800 border-gray-700 text-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Lock className="h-5 w-5 text-white mr-2" />
            <h2 className="text-xl font-semibold text-white">Security</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-white font-medium">Two-Factor Authentication</label>
                <p className="text-gray-400 text-sm">Add an extra layer of security</p>
              </div>
              <input
                type="checkbox"
                checked={settings.security.twoFactor}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    twoFactor: e.target.checked,
                  },
                })}
                className="rounded bg-gray-800 border-gray-700 text-blue-500"
              />
            </div>
            <div>
              <label className="text-white font-medium block mb-2">Session Timeout (minutes)</label>
              <select
                value={settings.security.sessionTimeout}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    sessionTimeout: e.target.value,
                  },
                })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}