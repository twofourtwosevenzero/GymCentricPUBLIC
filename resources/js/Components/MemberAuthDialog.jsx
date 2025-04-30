import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Grid,
  Avatar,
  CircularProgress,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import QrCodeIcon from '@mui/icons-material/QrCode';
import FingerprintIcon from '@mui/icons-material/Fingerprint';

export default function MemberAuthDialog({ 
  open, 
  onClose, 
  memberId, 
  memberName,
  onConfirmCheckIn,
  authMethod = 'qrcode', // 'qrcode' or 'fingerprint'
  staffBranch
}) {
  const [loading, setLoading] = useState(true);
  const [memberDetails, setMemberDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && memberId) {
      fetchMemberDetails(memberId);
    } else if (!open) {
      setMemberDetails(null);
      setError(null);
    }
  }, [open, memberId]);

  const fetchMemberDetails = async (id) => {
    setLoading(true);
    setError(null);

    try {
      // Replace with your actual endpoint for fetching member details
      const response = await axios.get(`/api/members/${id}`);
      setMemberDetails(response.data);
    } catch (error) {
      console.error('Error fetching member details:', error);
      setError('Failed to load member details');
    } finally {
      setLoading(false);
    }
  };
 // --- MemberAuthDialog.jsx ---
const handleConfirmCheckIn = async () => {
  if (!memberDetails) return;
  setError(null);

  // Instead of posting here, we trust the parent to do it:
  try {
    // Let the parent handle the actual axios call
    if (onConfirmCheckIn) {
      await onConfirmCheckIn(memberDetails);
    }
    onClose();
  } catch (error) {
    console.error("Error from parent check-in:", error);
    setError("Failed to check in. Please try again.");
  }
};

  

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status chip colors based on status name
  const getStatusChipProps = (statusName) => {
    if (!statusName) return { color: "default", variant: "contained" };
    
    switch (statusName.toLowerCase()) {
      case "active":
        return { color: "success", variant: "contained" };
      case "pending":
        return { sx: { backgroundColor: "#ff9800", color: "#fff" }, variant: "contained" };
      case "expired":
        return { sx: { backgroundColor: "#ff7043", color: "#fff" }, variant: "contained" };
      case "frozen":
        return { color: "info", variant: "contained" };
      case "on hold":
        return { sx: { backgroundColor: "#ffeb3b", color: "#000" }, variant: "contained" };
      case "inactive":
        return { color: "default", variant: "contained" };
      case "terminated":
        return { sx: { backgroundColor: "#b71c1c", color: "#fff" }, variant: "contained" };
      default:
        return { color: "default", variant: "contained" };
    }
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
          {authMethod === 'fingerprint' ? (
            <FingerprintIcon sx={{ mr: 1 }} />
          ) : (
            <QrCodeIcon sx={{ mr: 1 }} />
          )}
          <Typography variant="h6">
            {authMethod === 'fingerprint' 
              ? 'Fingerprint Authentication Successful' 
              : 'QR Code Scan Successful'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => fetchMemberDetails(memberId)}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          </Box>
        ) : memberDetails ? (
          <>
            <Box sx={{ display: 'flex', mb: 3, alignItems: 'center' }}>
            {memberDetails.PhotoPath ? (
            <Avatar
              variant="square"
              src={`/storage/${memberDetails.PhotoPath}`}
              alt={memberDetails.FullName}
              sx={{ width: 120, height: 120, mr: 3 }}
            />
          ) : (
            <Avatar
              variant="square"
              sx={{ width: 120, height: 120, mr: 3, bgcolor: 'primary.main' }}
            >
              <PersonIcon fontSize="large" />
            </Avatar>
          )}


              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {memberDetails.FullName}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Member ID: {memberDetails.MemberID}
                </Typography>
                
                {memberDetails.status && (
                  <Chip 
                    label={memberDetails.status.StatusName || 'Active'}
                    size="small"
                    {...getStatusChipProps(memberDetails.status.StatusName)}
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Membership Plan
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {memberDetails.plan?.PlanName || 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Membership Status
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {memberDetails.status?.StatusName || 'Active'}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Start Date
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {formatDate(memberDetails.MembershipStartDate)}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  End Date
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {formatDate(memberDetails.MembershipEndDate)}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {memberDetails.Phone || 'N/A'}
                </Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {memberDetails.Email || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          </>
        ) : (
          <Typography>No member data available</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleConfirmCheckIn} fullWidth>
        Confirm Check-In
      </Button>
      </DialogActions>
    </Dialog>
  );
} 