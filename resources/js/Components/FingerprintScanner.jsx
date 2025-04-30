import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';

export default function FingerprintScanner({ onAuthenticated, branchId, disabled = false }) {
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let scanningInterval;
    
    // Start automatic scanning when component mounts
    if (!disabled) {
      startScanning();
    }
    
    // Cleanup on unmount
    return () => {
      if (scanningInterval) clearInterval(scanningInterval);
    };
  }, [disabled]);

  const startScanning = () => {
    if (scanning || disabled) return;
    
    setScanning(true);
    setStatus('scanning');
    
    // Request authentication options from the server
    requestAuthenticationOptions()
      .then(options => {
        // Begin authentication with the options
        return startAuthentication(options);
      })
      .catch(error => {
        console.error('Authentication error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An error occurred during authentication');
        setScanning(false);
      });
  };

  const requestAuthenticationOptions = async () => {
    try {
      const response = await axios.post('/api/webauthn/authenticate/options');
      return response.data;
    } catch (error) {
      console.error('Error getting authentication options:', error);
      throw new Error('Failed to get authentication options');
    }
  };

  const startAuthentication = async (options) => {
    try {
      // Convert base64url challenge to ArrayBuffer
      options.challenge = Uint8Array.from(
        atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), 
        c => c.charCodeAt(0)
      );
      
      // Convert base64url allowed credentials to ArrayBuffer if they exist
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map(credential => {
          return {
            ...credential,
            id: Uint8Array.from(
              atob(credential.id.replace(/-/g, '+').replace(/_/g, '/')), 
              c => c.charCodeAt(0)
            )
          };
        });
      }

      // Prompt user for authentication with their fingerprint
      const credential = await navigator.credentials.get({
        publicKey: options
      });

      // Convert the authentication response to a format the server can verify
      const authenticatedCredential = {
        id: credential.id,
        type: credential.type,
        rawId: arrayBufferToBase64(credential.rawId),
        response: {
          authenticatorData: arrayBufferToBase64(credential.response.authenticatorData),
          clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
          signature: arrayBufferToBase64(credential.response.signature),
          userHandle: credential.response.userHandle ? arrayBufferToBase64(credential.response.userHandle) : null
        }
      };

      // Send the credential to the server for verification
      const response = await axios.post('/api/webauthn/authenticate', {
        branch_id: branchId,
        credential: authenticatedCredential
      });

      // Handle successful authentication
      if (response.data.success) {
        setStatus('success');
        // Call the onAuthenticated callback with the authenticated member data
        if (onAuthenticated) {
          onAuthenticated(response.data.member);
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Authentication failed');
    } finally {
      setScanning(false);
    }
  };

  // Helper function to convert ArrayBuffer to Base64 string
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Retry scanning if an error occurred
  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage('');
    startScanning();
  };

  return (
    <Card variant="outlined" sx={{ mb: 2, backgroundColor: '#f8f9fa' }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
          {status === 'idle' && (
            <>
              <FingerprintIcon fontSize="large" color="primary" />
              <Typography variant="body1" sx={{ mt: 1 }}>
                Ready to scan fingerprint
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={startScanning}
                disabled={disabled}
                sx={{ mt: 2 }}
              >
                Start Scanning
              </Button>
            </>
          )}

          {status === 'scanning' && (
            <>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body1">
                Please scan your fingerprint...
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <FingerprintIcon fontSize="large" color="success" />
              <Typography variant="body1" color="success.main" sx={{ mt: 1 }}>
                Fingerprint verified!
              </Typography>
            </>
          )}

          {status === 'error' && (
            <>
              <FingerprintIcon fontSize="large" color="error" />
              <Typography variant="body1" color="error" sx={{ mt: 1 }}>
                {errorMessage}
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRetry}
                sx={{ mt: 2 }}
              >
                Try Again
              </Button>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
} 