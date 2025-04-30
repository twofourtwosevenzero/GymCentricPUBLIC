// File: ./layouts/AddWalkInLayout.jsx
import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";

export default function WalkInDialogLayout({
  isOpen,
  onClose,
  walkInData,
  onChange,
  onAdd,
}) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"  // moderate maximum width
      sx={{ "& .MuiDialog-paper": { p: 2 } }}
    >
      <DialogTitle sx={{ typography: "h5", fontWeight: 500 }}>
        Add New Walk-In
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            {/* Full Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                name="FullName"
                value={walkInData.FullName}
                onChange={onChange}
                variant="outlined"
              />
            </Grid>

            {/* Phone */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                name="Phone"
                value={walkInData.Phone}
                onChange={onChange}
                variant="outlined"
              />
            </Grid>

            {/* Visit Date & Time */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Visit Date"
                name="VisitDate"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={walkInData.VisitDate}
                onChange={onChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Visit Time"
                name="VisitTime"
                type="time"
                InputLabelProps={{ shrink: true }}
                value={walkInData.VisitTime}
                onChange={onChange}
                variant="outlined"
              />
            </Grid>

            {/* Purpose */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Purpose"
                name="Purpose"
                value={walkInData.Purpose}
                onChange={onChange}
                variant="outlined"
              />
            </Grid>

            {/* Payment ID */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payment ID"
                name="PaymentID"
                value={walkInData.PaymentID}
                onChange={onChange}
                variant="outlined"
              />
            </Grid>

            {/* Mode of Payment */}
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="mode-of-payment-label">
                  Mode of Payment
                </InputLabel>
                <Select
                  labelId="mode-of-payment-label"
                  label="Mode of Payment"
                  name="ModeOfPayment"
                  value={walkInData.ModeOfPayment}
                  onChange={onChange}
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="GCash">GCash</MenuItem>
                  <MenuItem value="BPI">BPI</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Amount Paid */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount Paid"
                name="AmountPaid"
                type="number"
                value={walkInData.AmountPaid}
                onChange={onChange}
                variant="outlined"
              />
            </Grid>

            {/* Remarks */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                name="Remarks"
                value={walkInData.Remarks}
                onChange={onChange}
                multiline
                rows={3}
                variant="outlined"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={onAdd}>
          Add Walk-In
        </Button>
      </DialogActions>
    </Dialog>
  );
}
