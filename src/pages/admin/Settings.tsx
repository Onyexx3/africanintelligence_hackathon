import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Mail, 
  Lock,
  Github,
  Linkedin,
  Chrome,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://africanapi.onrender.com/api';

interface SystemSettings {
  emailVerificationRequired: boolean;
  twoFactorEnabled: boolean;
  passwordResetEnabled: boolean;
  socialLoginProviders: {
    google: { enabled: boolean; clientId: string };
    github: { enabled: boolean; clientId: string; clientSecret: string };
    linkedin: { enabled: boolean; clientId: string; clientSecret: string };
  };
  registrationMode: 'open' | 'closed' | 'invite';
  emailProvider: {
    service: string;
    user: string;
    configured: boolean;
  };
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    emailVerificationRequired: false,
    twoFactorEnabled: true,
    passwordResetEnabled: true,
    socialLoginProviders: {
      google: { enabled: true, clientId: '' },
      github: { enabled: false, clientId: '', clientSecret: '' },
      linkedin: { enabled: false, clientId: '', clientSecret: '' }
    },
    registrationMode: 'open',
    emailProvider: {
      service: 'gmail',
      user: '',
      configured: false
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/settings`, {
        headers: { 'x-auth-token': token }
      });
      setSettings(response.data);
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Use default settings if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/admin/settings`, settings, {
        headers: { 'x-auth-token': token }
      });

      toast({
        title: 'Settings Saved',
        description: 'System settings updated successfully',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            System Settings
          </h1>
          <p className="text-gray-400 mt-1">Configure authentication and security features</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="security" className="space-y-4">
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="authentication">
            <Lock className="mr-2 h-4 w-4" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="social">
            <Chrome className="mr-2 h-4 w-4" />
            Social Login
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Security Features</CardTitle>
              <CardDescription>Enable or disable security features system-wide</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 2FA */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="2fa" className="text-white font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-400">
                    Allow users to enable 2FA on their accounts
                  </p>
                </div>
                <Switch
                  id="2fa"
                  checked={settings.twoFactorEnabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    twoFactorEnabled: checked
                  })}
                />
              </div>

              {/* Password Reset */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="password-reset" className="text-white font-medium">Password Reset</Label>
                  <p className="text-sm text-gray-400">
                    Enable password reset via email
                  </p>
                </div>
                <Switch
                  id="password-reset"
                  checked={settings.passwordResetEnabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    passwordResetEnabled: checked
                  })}
                />
              </div>

              {/* Email Verification */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="email-verify" className="text-white font-medium">Email Verification Required</Label>
                  <p className="text-sm text-gray-400">
                    Require users to verify their email before accessing the platform
                  </p>
                </div>
                <Switch
                  id="email-verify"
                  checked={settings.emailVerificationRequired}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    emailVerificationRequired: checked
                  })}
                />
              </div>

              {settings.emailVerificationRequired && !settings.emailProvider.configured && (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-100">
                    Email provider not configured. Please configure email settings in the Email tab.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Authentication Tab */}
        <TabsContent value="authentication" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Registration Settings</CardTitle>
              <CardDescription>Control how users can register</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Registration Mode</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="open"
                      name="registration"
                      value="open"
                      checked={settings.registrationMode === 'open'}
                      onChange={(e) => setSettings({
                        ...settings,
                        registrationMode: e.target.value as any
                      })}
                      className="text-orange-500"
                    />
                    <div>
                      <Label htmlFor="open" className="text-white font-medium">Open Registration</Label>
                      <p className="text-sm text-gray-400">Anyone can register</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="invite"
                      name="registration"
                      value="invite"
                      checked={settings.registrationMode === 'invite'}
                      onChange={(e) => setSettings({
                        ...settings,
                        registrationMode: e.target.value as any
                      })}
                      className="text-orange-500"
                    />
                    <div>
                      <Label htmlFor="invite" className="text-white font-medium">Invite Only</Label>
                      <p className="text-sm text-gray-400">Requires an invitation code</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="closed"
                      name="registration"
                      value="closed"
                      checked={settings.registrationMode === 'closed'}
                      onChange={(e) => setSettings({
                        ...settings,
                        registrationMode: e.target.value as any
                      })}
                      className="text-orange-500"
                    />
                    <div>
                      <Label htmlFor="closed" className="text-white font-medium">Closed</Label>
                      <p className="text-sm text-gray-400">Registration disabled</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Login Tab */}
        <TabsContent value="social" className="space-y-4">
          {/* Google */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Chrome className="w-5 h-5 text-white" />
                <CardTitle className="text-white">Google OAuth</CardTitle>
              </div>
              <CardDescription>Configure Google authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="google-enabled" className="text-white">Enable Google Login</Label>
                <Switch
                  id="google-enabled"
                  checked={settings.socialLoginProviders.google.enabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    socialLoginProviders: {
                      ...settings.socialLoginProviders,
                      google: { ...settings.socialLoginProviders.google, enabled: checked }
                    }
                  })}
                />
              </div>
              {settings.socialLoginProviders.google.enabled && (
                <div className="space-y-2">
                  <Label className="text-white">Client ID</Label>
                  <Input
                    placeholder="Google Client ID"
                    value={settings.socialLoginProviders.google.clientId}
                    onChange={(e) => setSettings({
                      ...settings,
                      socialLoginProviders: {
                        ...settings.socialLoginProviders,
                        google: { ...settings.socialLoginProviders.google, clientId: e.target.value }
                      }
                    })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* GitHub */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-white" />
                <CardTitle className="text-white">GitHub OAuth</CardTitle>
              </div>
              <CardDescription>Configure GitHub authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="github-enabled" className="text-white">Enable GitHub Login</Label>
                <Switch
                  id="github-enabled"
                  checked={settings.socialLoginProviders.github.enabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    socialLoginProviders: {
                      ...settings.socialLoginProviders,
                      github: { ...settings.socialLoginProviders.github, enabled: checked }
                    }
                  })}
                />
              </div>
              {settings.socialLoginProviders.github.enabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-white">Client ID</Label>
                    <Input
                      placeholder="GitHub Client ID"
                      value={settings.socialLoginProviders.github.clientId}
                      onChange={(e) => setSettings({
                        ...settings,
                        socialLoginProviders: {
                          ...settings.socialLoginProviders,
                          github: { ...settings.socialLoginProviders.github, clientId: e.target.value }
                        }
                      })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Client Secret</Label>
                    <Input
                      type="password"
                      placeholder="GitHub Client Secret"
                      value={settings.socialLoginProviders.github.clientSecret}
                      onChange={(e) => setSettings({
                        ...settings,
                        socialLoginProviders: {
                          ...settings.socialLoginProviders,
                          github: { ...settings.socialLoginProviders.github, clientSecret: e.target.value }
                        }
                      })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* LinkedIn */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-white" />
                <CardTitle className="text-white">LinkedIn OAuth</CardTitle>
              </div>
              <CardDescription>Configure LinkedIn authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="linkedin-enabled" className="text-white">Enable LinkedIn Login</Label>
                <Switch
                  id="linkedin-enabled"
                  checked={settings.socialLoginProviders.linkedin.enabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    socialLoginProviders: {
                      ...settings.socialLoginProviders,
                      linkedin: { ...settings.socialLoginProviders.linkedin, enabled: checked }
                    }
                  })}
                />
              </div>
              {settings.socialLoginProviders.linkedin.enabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-white">Client ID</Label>
                    <Input
                      placeholder="LinkedIn Client ID"
                      value={settings.socialLoginProviders.linkedin.clientId}
                      onChange={(e) => setSettings({
                        ...settings,
                        socialLoginProviders: {
                          ...settings.socialLoginProviders,
                          linkedin: { ...settings.socialLoginProviders.linkedin, clientId: e.target.value }
                        }
                      })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Client Secret</Label>
                    <Input
                      type="password"
                      placeholder="LinkedIn Client Secret"
                      value={settings.socialLoginProviders.linkedin.clientSecret}
                      onChange={(e) => setSettings({
                        ...settings,
                        socialLoginProviders: {
                          ...settings.socialLoginProviders,
                          linkedin: { ...settings.socialLoginProviders.linkedin, clientSecret: e.target.value }
                        }
                      })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Email Configuration</CardTitle>
              <CardDescription>Configure email provider for sending emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.emailProvider.configured ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-100">
                    Email provider is configured and ready
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-100">
                    Configure email settings in server/.env file
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-300">Add to <code className="text-orange-500">server/.env</code>:</p>
                <pre className="text-xs text-gray-300 overflow-x-auto">
{`EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password`}
                </pre>
                <p className="text-xs text-gray-400">
                  Gmail App Password: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                    Create here
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
