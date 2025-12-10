import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://africanapi.onrender.com/api';

export default function Verify2FA() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Get pending auth data from location state
  const { token, role, user } = location.state || {};

  const handleVerify = async () => {
    if (!code || (useBackupCode ? code.length !== 8 : code.length !== 6)) {
      setError(useBackupCode ? 'Please enter a valid 8-character backup code' : 'Please enter a valid 6-digit code');
      return;
    }

    if (!token) {
      setError('Session expired. Please login again.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/2fa/verify`, {
        token: code
      }, {
        headers: { 'x-auth-token': token }
      });

      if (response.data.verified) {
        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        toast({
          title: 'Welcome back!',
          description: '2FA verification successful',
        });

        // Redirect based on role
        const redirectPath = role === 'facilitator' ? '/facilitator' : '/student';
        navigate(redirectPath);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCode = async () => {
    // Similar to handleVerify but for backup codes
    // Backup codes are handled by the same endpoint but with longer codes
    handleVerify();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-orange-500/20 bg-gray-800/50 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-orange-500" />
          </div>
          <CardTitle className="text-2xl text-white">Two-Factor Authentication</CardTitle>
          <CardDescription className="text-gray-300">
            {useBackupCode 
              ? 'Enter one of your backup codes'
              : 'Enter the code from your authenticator app'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-white">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </Label>
            <Input
              id="code"
              type="text"
              placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
              value={code}
              onChange={(e) => setCode(
                useBackupCode 
                  ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
                  : e.target.value.replace(/\D/g, '').slice(0, 6)
              )}
              maxLength={useBackupCode ? 8 : 6}
              className="bg-gray-700 border-gray-600 text-white text-center text-2xl tracking-widest"
              autoFocus
            />
            <p className="text-xs text-gray-400 text-center">
              {useBackupCode ? '8-character code' : '6-digit code'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={useBackupCode ? handleBackupCode : handleVerify}
            disabled={loading || (useBackupCode ? code.length !== 8 : code.length !== 6)}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>

          <div className="text-center">
            <Button
              onClick={() => setUseBackupCode(!useBackupCode)}
              variant="link"
              className="text-orange-500 hover:text-orange-400"
            >
              {useBackupCode ? 'Use authenticator code' : 'Use backup code instead'}
            </Button>
          </div>

          <Button
            onClick={() => navigate('/login')}
            variant="ghost"
            className="w-full text-gray-300 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
