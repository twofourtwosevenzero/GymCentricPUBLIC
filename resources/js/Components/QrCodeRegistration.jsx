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
  TextField,
  Divider,
  IconButton,
  Collapse,
  Paper
} from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import BugReportIcon from '@mui/icons-material/BugReport';

export default function QrCodeRegistration({ open, onClose, memberId, memberName, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  // Removed validityDays state since QR code is permanent.
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const handleGenerateAndEmailQrCode = async () => {
    if (!memberId) {
      setError('Member ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // POST without sending validity_days since the QR code is permanent.
      const response = await axios.post(`/membership/members/${memberId}/qrcode/email`);
      
      if (response.data.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess('QR code generated and emailed successfully');
        }
      } else {
        setError(response.data.message || 'Failed to generate and email QR code');
      }
    } catch (error) {
      console.error('Error generating and emailing QR code:', error);
      const errorMessage = error.response?.data?.message || 
                           error.message || 
                           'Error emailing QR code. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkMailjetConfig = async () => {
    setDebugLoading(true);
    try {
      const response = await axios.get('/qrcode/debug-config');
      setDebugInfo(response.data.config);
      setShowDebug(true);
    } catch (error) {
      console.error('Error checking config:', error);
      setError('Could not check configuration: ' + (error.message || 'Unknown error'));
    } finally {
      setDebugLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setError(null);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EmailIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Email QR Code to {memberName}</Typography>
          </Box>
          {!loading && !success && (
            <IconButton 
              color="inherit" 
              size="small" 
              onClick={checkMailjetConfig}
              disabled={debugLoading}
            >
              <BugReportIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" my={4} flexDirection="column">
            <CircularProgress size={60} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Generating and emailing QR code...
            </Typography>
          </Box>
        ) : error ? (
          <>
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
            <Collapse in={showDebug && debugInfo}>
              <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Configuration Details:
                </Typography>
                {debugInfo && (
                  <Box 
                    component="pre" 
                    sx={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '200px', whiteSpace: 'pre-wrap' }}
                  >
                    {Object.entries(debugInfo).map(([key, value]) => (
                      <div key={key}>
                        {key}: {value}
                      </div>
                    ))}
                  </Box>
                )}
              </Paper>
            </Collapse>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={handleGenerateAndEmailQrCode}
                startIcon={<EmailIcon />}
              >
                Try Again
              </Button>
            </Box>
          </>
        ) : success ? (
          <Box textAlign="center" my={3}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              QR Code Email Sent!
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              A QR code has been successfully generated and emailed to {memberName}.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              The member should check their email inbox for the QR code.
            </Typography>
            <Typography variant="body2" color="info.main" sx={{ mt: 1, fontSize: '0.75rem' }}>
              Note: They may need to enable images in their email client to see the QR code.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Generate a QR code for this member and email it to them. The member can save the QR code from the email to use for check-ins at the gym.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
              QR Code Settings
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will generate a permanent QR code and email it directly to {memberName}'s registered email address.
              </Typography>
            </Box>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleGenerateAndEmailQrCode}
              fullWidth
              size="large"
              startIcon={<EmailIcon />}
            >
              Generate & Email QR Code
            </Button>
          </Box>
        )}
        
        {debugLoading && (
          <Box display="flex" justifyContent="center" mt={2}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Checking configuration...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {success ? 'Close' : 'Cancel'}
        </Button>
        {success && (
          <Button onClick={handleReset} variant="contained" color="primary">
            Send Another QR Code
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
