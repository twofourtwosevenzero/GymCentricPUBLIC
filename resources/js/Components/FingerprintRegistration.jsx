import React, { useState } from 'react';
import axios from 'axios';
import { 
  Dialog,
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function FingerprintRegistration({ open, onClose, memberId, memberName, onSuccess }) {
  const [activeStep, setActiveStep] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, registering, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    if (!memberId) {
      setErrorMessage('Member ID is required');
      setStatus('error');
      return;
    }

    setStatus('registering');
    setErrorMessage('');

    try {
      // Step 1: Get registration options from the server
      const optionsResponse = await axios.post('/api/webauthn/register/options', {
        member_id: memberId
      });
      
      const options = optionsResponse.data;
      
      // Step 2: Prepare options for the WebAuthn API
      const publicKeyOptions = preparePublicKeyOptions(options);
      
      // Step 3: Advance to the next step
      setActiveStep(1);
      
      // Step 4: Request the fingerprint from the user
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });
      
      // Step 5: Convert the credential to a format the server can verify
      const registeredCredential = {
        id: credential.id,
        type: credential.type,
        rawId: arrayBufferToBase64(credential.rawId),
        response: {
          attestationObject: arrayBufferToBase64(credential.response.attestationObject),
          clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON)
        }
      };
      
      // Step 6: Advance to verification step
      setActiveStep(2);
      
      // Step 7: Send the credential to the server for verification
      await axios.post('/api/webauthn/register', {
        member_id: memberId,
        credential: registeredCredential
      });
      
      // Step 8: Update status on success
      setStatus('success');
      setActiveStep(3);
      
      // Notify parent of success
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Fingerprint registration error:', error);
      setStatus('error');
      setErrorMessage(error.response?.data?.error || error.message || 'An error occurred during registration');
    }
  };

  // Helper function to prepare options for WebAuthn API
  const preparePublicKeyOptions = (options) => {
    // Convert base64url encoded challenge to ArrayBuffer
    options.challenge = Uint8Array.from(
      atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), 
      c => c.charCodeAt(0)
    );
    
    // Convert user ID to ArrayBuffer
    if (options.user && options.user.id) {
      options.user.id = Uint8Array.from(
        atob(options.user.id.replace(/-/g, '+').replace(/_/g, '/')), 
        c => c.charCodeAt(0)
      );
    }
    
    // Convert excluded credentials if they exist
    if (options.excludeCredentials) {
      options.excludeCredentials = options.excludeCredentials.map(credential => {
        return {
          ...credential,
          id: Uint8Array.from(
            atob(credential.id.replace(/-/g, '+').replace(/_/g, '/')), 
            c => c.charCodeAt(0)
          )
        };
      });
    }
    
    return options;
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

  const handleReset = () => {
    setActiveStep(0);
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FingerprintIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Register Fingerprint for {memberName}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          <Step>
            <StepLabel>Prepare fingerprint scanner</StepLabel>
            <StepContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Make sure your WA28 fingerprint scanner is connected and Windows Hello is enabled.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleRegister}
                  disabled={status === 'registering'}
                >
                  {status === 'registering' ? (
                    <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                  ) : null}
                  Start Registration
                </Button>
              </Box>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Scan your finger</StepLabel>
            <StepContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Please place your finger on the scanner when prompted.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
                <CircularProgress size={40} />
              </Box>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Verifying fingerprint</StepLabel>
            <StepContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Verifying and saving your fingerprint...
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
                <CircularProgress size={40} />
              </Box>
            </StepContent>
          </Step>

          <Step>
            <StepLabel>Registration complete</StepLabel>
            <StepContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  Fingerprint registered successfully!
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                The member can now use their fingerprint for check-ins at the gym.
              </Typography>
            </StepContent>
          </Step>
        </Stepper>

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
            <Button color="inherit" size="small" onClick={handleReset} sx={{ ml: 1 }}>
              Try Again
            </Button>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {status === 'success' ? 'Close' : 'Cancel'}
        </Button>
        {status === 'success' && (
          <Button onClick={handleReset} variant="contained" color="primary">
            Register Another Finger
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
} 