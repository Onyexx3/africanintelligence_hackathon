import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, Copy, AlertCircle, Loader2, Smartphone, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://africanapi.onrender.com/api';

export default function Setup2FA() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'backup' | 'complete'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Check if 2FA is already enabled
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/2fa/status`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.data.enabled) {
        navigate('/student/security'); // Already enabled, go to security page
      }
    } catch (err) {
      console.error('Status check error:', err);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/2fa/setup`, {}, {
        headers: { 'x-auth-token': token }
      });

      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setStep('verify');
      
      toast({
        title: 'QR Code Generated',
        description: 'Scan with your authenticator app',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/2fa/verify-setup`, {
        token: verificationCode
      }, {
        headers: { 'x-auth-token': token }
      });

      if (response.data.success) {
        // Generate backup codes
        const backupResponse = await axios.post(`${API_URL}/2fa/backup-codes`, {}, {
          headers: { 'x-auth-token': token }
        });

        setBackupCodes(backupResponse.data.backupCodes);
        setStep('backup');
        
        toast({
          title: '2FA Activated!',
          description: 'Save your backup codes',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({
      title: 'Copied!',
      description: 'Secret key copied to clipboard',
    });
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: 'Copied!',
      description: 'Backup codes copied to clipboard',
    });
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'african-intelligence-backup-codes.txt';
    a.click();
  };

  const handleComplete = () => {
    setStep('complete');
    setTimeout(() => navigate('/student/security'), 2000);
  };

  // Step 1: Initial Setup
  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-orange-500/20 bg-gray-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-orange-500" />
            </div>
            <CardTitle className="text-2xl text-white">Enable Two-Factor Authentication</CardTitle>
            <CardDescription className="text-gray-300">
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-gray-300">
              <p className="font-medium text-white">What is 2FA?</p>
              <p>Two-factor authentication adds a second layer of security by requiring a code from your phone in addition to your password.</p>
              
              <p className="font-medium text-white mt-4">What you'll need:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>Your smartphone</li>
                <li>About 2 minutes</li>
              </ul>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSetup}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Get Started
                </>
              )}
            </Button>

            <Button
              onClick={() => navigate('/student/security')}
              variant="ghost"
              className="w-full text-gray-300 hover:text-white"
            >
              Maybe Later
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Scan QR Code & Verify
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-orange-500/20 bg-gray-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Scan QR Code</CardTitle>
            <CardDescription className="text-gray-300">
              Use your authenticator app to scan this code
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg">
              <img src={qrCode} alt="2FA QR Code" className="w-full" />
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Can't scan? Enter manually:</Label>
              <div className="flex gap-2">
                <Input
                  value={secret}
                  readOnly
                  className="bg-gray-700 border-gray-600 text-white font-mono text-xs"
                />
                <Button
                  onClick={copySecret}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="code" className="text-white">Enter 6-digit code from app:</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="bg-gray-700 border-gray-600 text-white text-center text-2xl tracking-widest"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Enable'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Backup Codes
  if (step === 'backup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-orange-500/20 bg-gray-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Key className="w-10 h-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-white">Save Your Backup Codes</CardTitle>
            <CardDescription className="text-gray-300">
              Use these codes if you lose access to your authenticator app
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-100">
                Save these codes in a secure place. Each code can only be used once.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-700 p-4 rounded-lg space-y-2">
              {backupCodes.map((code, index) => (
                <div key={index} className="font-mono text-white text-center text-lg">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copyBackupCodes}
                variant="outline"
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                onClick={downloadBackupCodes}
                variant="outline"
                className="flex-1"
              >
                Download
              </Button>
            </div>

            <Button
              onClick={handleComplete}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              I've Saved My Codes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Complete
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-orange-500/20 bg-gray-800/50 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-white">2FA Enabled Successfully!</CardTitle>
          <CardDescription className="text-gray-300">
            Your account is now more secure
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
