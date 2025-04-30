import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Alert, IconButton, Slider, FormControlLabel, Switch } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { Html5Qrcode } from 'html5-qrcode';
import CachedIcon from '@mui/icons-material/Cached';
import BrightnessLowIcon from '@mui/icons-material/BrightnessLow';

const QrCodeScanner = ({ branchId, onSuccess, onError, alwaysOn = false, containerStyle = {} }) => {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(alwaysOn);
  const scannerRef = useRef(null);
  const [cooldown, setCooldown] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [exposureValue, setExposureValue] = useState(-5); // Changed from -2 to -5 for lowest exposure
  const [hasExposureSupport, setHasExposureSupport] = useState(false);
  const [autoExposure, setAutoExposure] = useState(false);

  useEffect(() => {
    if (alwaysOn) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [alwaysOn]);

  // Apply exposure settings when they change
  useEffect(() => {
    if (streamRef.current && hasExposureSupport) {
      applyExposureSettings();
    }
  }, [exposureValue, autoExposure]);

  const applyExposureSettings = async () => {
    try {
      if (!streamRef.current) return;
      
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;
      
      const capabilities = videoTrack.getCapabilities();
      
      // Check if exposure control is supported
      if (!capabilities.exposureMode) {
        console.log('Camera does not support exposure control');
        return;
      }
      
      setHasExposureSupport(true);
      
      const constraints = {};
      
      if (autoExposure) {
        // Auto exposure
        constraints.exposureMode = 'auto';
      } else {
        // Manual exposure
        constraints.exposureMode = 'manual';
        
        if (capabilities.exposureTime) {
          // Set exposure time (lower values = less exposure = better for bright QR codes)
          const min = capabilities.exposureTime.min;
          const max = capabilities.exposureTime.max;
          // Map our -5 to 5 range to the camera's capabilities
          const mappedValue = min + ((max - min) * ((exposureValue + 5) / 10));
          constraints.exposureTime = mappedValue;
        }
        
        // Some devices use exposureCompensation instead
        if (capabilities.exposureCompensation) {
          const min = capabilities.exposureCompensation.min;
          const max = capabilities.exposureCompensation.max;
          // Map our value to the camera's range
          const range = max - min;
          const step = range / 10;
          constraints.exposureCompensation = min + ((exposureValue + 5) * step);
        }
      }
      
      await videoTrack.applyConstraints({ advanced: [constraints] });
      console.log('Applied exposure settings:', constraints);
    } catch (err) {
      console.error('Error setting exposure:', err);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setError(null);
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          // Set initial low exposure for better QR scanning in bright conditions
          advanced: [{ exposureMode: 'manual', exposureCompensation: -5 }]
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Check if camera supports exposure control
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        setHasExposureSupport(
          capabilities && (capabilities.exposureMode || capabilities.exposureCompensation)
        );
        
        // Apply initial exposure settings
        applyExposureSettings();
      }
      
      if (scannerRef.current) {
        await startScan();
        return;
      }
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      await startScan();
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access was denied. Please check your browser settings and try again.');
      } else {
        setError('Error starting QR scanner. Please ensure you have a camera connected.');
      }
      setScanning(false);
      if (onError)
        onError(
          <span style={{ color: "orange" }}>
            {err.message || "QR Code scanner starting"}
          </span>
        );
    }
  };

  const startScan = async () => {
    if (!scannerRef.current) return;
    try {
      const qrCodeSuccessCallback = async (decodedText, decodedResult) => {
        if (decodedText && !cooldown) {
          setCooldown(true);
          try {
            // Stop the current scanning session
            await scannerRef.current.stop();
            // Verify the scanned QR code
            await verifyQrCode(decodedText);
          } catch (err) {
            console.error("Error during QR code processing:", err);
          } finally {
            // If alwaysOn is true, reset the cooldown and restart scanning
            if (alwaysOn) {
              setCooldown(false);
              await startScan();
            }
          }
        }
      };
  
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };
  
      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        (errMessage) => {
          if (!errMessage.includes("No QR code found")) {
            console.warn("QR scan error:", errMessage);
          }
        }
      );
    } catch (err) {
      console.error("Error starting scan:", err);
      setError("Could not start camera scan. Please check your camera permissions.");
    }
  };
  
  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current._isScanning) {
      scannerRef.current.stop()
        .then(() => console.log('QR code scanner stopped'))
        .catch(err => console.error('Error stopping scanner:', err));
    }
    
    // Release camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setScanning(false);
  };

  const verifyQrCode = async (qrCode) => {
    try {
      setLoading(true);
      const response = await axios.post('/qrcode/verify', {
        qr_code: qrCode,
        branch_id: branchId
      });
      if (response.data.success) {
        const memberData = response.data.member;
        const formattedMember = {
          id: memberData.id,
          FullName: memberData.name,
          Email: memberData.email,
          MembershipEndDate: memberData.membership_end_date,
        };
        if (onSuccess) onSuccess(formattedMember);
        if (!alwaysOn) setOpen(false);
      } else {
        setError(response.data.message || 'Failed to verify QR code');
        if (onError) onError(response.data.message || 'Failed to verify QR code');
      }
    } catch (err) {
      console.error('Error verifying QR code:', err);
      setError(err.response?.data?.message || 'Error verifying QR code');
      if (onError) onError(err.response?.data?.message || 'Error verifying QR code');
    } finally {
      setLoading(false);
    }
  };

  const resetCameraPermissions = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' });
        if (result.state === 'denied') {
          alert('Please go to your browser settings to reset camera permissions for this site.');
          window.open('chrome://settings/content/camera');
        }
      }
      startScanner();
    } catch (err) {
      console.error('Error resetting permissions:', err);
      setError('Could not reset camera permissions. Please check your browser settings manually.');
    }
  };

  const renderScannerUI = () => (
    <Box sx={{ p: 2, ...containerStyle }}>
      {loading && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress size={40} />
        </Box>
      )}
      {error && (
        <Box textAlign="center">
          <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
          <Button variant="contained" color="primary" onClick={resetCameraPermissions} startIcon={<CachedIcon />} sx={{ mt: 2 }}>
            Reset Camera Access
          </Button>
        </Box>
      )}
      <Box id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }} />
      
      {hasExposureSupport && (
        <Box sx={{ mt: 2, px: 2, maxWidth: '400px', margin: '0 auto' }}>
          <Typography variant="body2" gutterBottom>
            <BrightnessLowIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
            Camera Exposure Control
          </Typography>
          
          <FormControlLabel
            control={
              <Switch 
                checked={autoExposure}
                onChange={(e) => setAutoExposure(e.target.checked)}
                size="small"
              />
            }
            label="Auto Exposure"
          />
          
          {!autoExposure && (
            <>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Lower values work better for bright QR codes
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ mr: 1 }}>Low</Typography>
                <Slider
                  value={exposureValue}
                  onChange={(e, newValue) => setExposureValue(newValue)}
                  min={-5}
                  max={-4}
                  step={1}
                  marks
                  size="small"
                  disabled={autoExposure}
                />
                <Typography variant="caption" sx={{ ml: 1 }}>High</Typography>
              </Box>
            </>
          )}
        </Box>
      )}
      
      <Typography variant="body2" align="center" sx={{ mt: 2 }}>
        Present a member QR code to the camera to check-in
      </Typography>
    </Box>
  );

  if (alwaysOn) {
    return renderScannerUI();
  } else {
    return (
      <>
        <Button variant="contained" color="primary" onClick={() => { setOpen(true); startScanner(); }}>
          Scan QR Code
        </Button>
        <Dialog open={open} onClose={() => { setOpen(false); stopScanner(); }} maxWidth="sm" fullWidth>
          <DialogTitle>
            Scan Member QR Code
            <IconButton aria-label="close" onClick={() => { setOpen(false); stopScanner(); }} sx={{ position: 'absolute', right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {renderScannerUI()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpen(false); stopScanner(); }} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
};

export default QrCodeScanner;
