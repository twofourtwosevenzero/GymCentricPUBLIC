import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';

const MemberQrCode = ({ memberId, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    loadQrCode();
  };

  const handleClose = () => {
    setOpen(false);
  };

  const loadQrCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/membership/members/${memberId}/qrcode`);
      if (response.data.success) {
        setQrCodeData(response.data.qr_code_data);
      } else {
        setQrCodeData(null);
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
      setError('Could not load member QR code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        View Member QR Code
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Member QR Code</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box textAlign="center" my={2}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : qrCodeData ? (
            <Box textAlign="center" my={2}>
              <QRCode 
                value={qrCodeData} 
                size={256}
                level="H"
                includeMargin={true}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                This is your permanent member QR code. Use it to check in at the gym.
              </Typography>
            </Box>
          ) : (
            <Box textAlign="center" my={2}>
              <Typography>No QR code available for this member.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MemberQrCode;
