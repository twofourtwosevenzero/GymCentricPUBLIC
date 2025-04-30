import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Divider,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  InputAdornment,
  Snackbar,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import WorkIcon from "@mui/icons-material/Work";
import StoreIcon from "@mui/icons-material/Store";
import DateRangeIcon from "@mui/icons-material/DateRange";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TimelapseIcon from "@mui/icons-material/Timelapse";

import axios from "axios";
import { route } from "ziggy-js";

// Notice: Removed HourlyRate and OvertimeRate from the initial state
const initialStaff = {
  FullName: "",
  Email: "",
  Phone: "",
  Role: "",
  BranchID: "",
  DateHired: "",
  DailyRate: "",
  Notes: "",
};

export default function AddNewStaffLayout({ onClose, onStaffAdded }) {
  const [newStaff, setNewStaff] = useState(initialStaff);
  const [branches, setBranches] = useState([]);
  const [errors, setErrors] = useState({});

  // For real-time derived rates (client-side display only)
  const [clientHourly, setClientHourly] = useState("");
  const [clientOvertime, setClientOvertime] = useState("");

  // Snackbar state for success messages
  const [snackMessage, setSnackMessage] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);

  // Confirmation modal state
  const [openConfirmation, setOpenConfirmation] = useState(false);

  // State for realtime submit button enablement
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);

  // Create refs for form fields
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const roleRef = useRef(null);
  const branchRef = useRef(null);
  const dateHiredRef = useRef(null);
  const dailyRateRef = useRef(null);
  const notesRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Handle Enter key navigation
  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    }
  };

  // ---------------------------
  // Fetch branches on mount
  // ---------------------------
  useEffect(() => {
    axios
      .get(route("branches.index"))
      .then((response) => {
        const arrayOfBranches = response.data.branches;
        setBranches(Array.isArray(arrayOfBranches) ? arrayOfBranches : []);
      })
      .catch((error) => {
        console.error("Error fetching branches:", error);
        setBranches([]);
      });
  }, []);

  // ---------------------------
  // Compute local (client-side) Hourly & OT whenever DailyRate changes
  // ---------------------------
  useEffect(() => {
    const daily = parseFloat(newStaff.DailyRate);
    if (!isNaN(daily) && daily > 0) {
      const hr = (daily / 8).toFixed(2);
      const ot = (hr * 1.25).toFixed(2);
      setClientHourly(hr);
      setClientOvertime(ot);
    } else {
      setClientHourly("");
      setClientOvertime("");
    }
  }, [newStaff.DailyRate]);

  // ---------------------------
  // Basic front-end validations
  // ---------------------------
  const isValidForm = () =>
    newStaff.FullName.trim() !== "" && newStaff.Email.trim() !== "";

  useEffect(() => {
    setIsSubmitEnabled(isValidForm());
  }, [newStaff]);

  // ---------------------------
  // Handle input changes
  // ---------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewStaff((prev) => ({ ...prev, [name]: value }));
  };

  // ---------------------------
  // Submit to back-end
  // ---------------------------
  const handleSubmit = async () => {
    // Clear any previous errors
    setErrors({});
    const newErrors = {};

    if (!newStaff.FullName.trim()) newErrors.FullName = "Full Name is required";
    if (!newStaff.Email.trim()) newErrors.Email = "Email is required";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      alert("Please fix the errors before submitting.");
      return;
    }

    try {
      // Build the payload — note: we do NOT send HourlyRate & OvertimeRate
      const payload = { ...newStaff };

      // Post
      const response = await axios.post(route("staff.store"), payload);
      const createdStaff = response.data;

      // Show success
      showSuccessMessage("Staff registration submitted!");

      // Let parent know
      if (onStaffAdded) {
        onStaffAdded(createdStaff);
      }
      onClose();
    } catch (error) {
      console.error("Error creating staff:", error);
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        alert("An error occurred while creating the staff.");
      }
    }
  };

  // ---------------------------
  // Snackbar helper
  // ---------------------------
  const showSuccessMessage = (msg) => {
    setSnackMessage(msg);
    setSnackOpen(true);
  };

  // ---------------------------
  // Confirmation modal handlers
  // ---------------------------
  const handleConfirmNo = () => setOpenConfirmation(false);
  const handleConfirmYes = async () => {
    await handleSubmit();
    setOpenConfirmation(false);
  };

  // ---------------------------
  // The UI
  // ---------------------------
  return (
    <>
      {/* Main Dialog */}
      <Dialog open onClose={onClose} fullWidth maxWidth="lg">
        {/* DIALOG TITLE */}
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              <PersonIcon sx={{ verticalAlign: "middle", mr: 1 }} />
              Add New Staff
            </Typography>
            <IconButton
              onClick={onClose}
              sx={{
                "&:hover": { color: "red" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* DIALOG CONTENT */}
        <DialogContent dividers>
          <Box sx={{ p: 2 }}>
            <Divider sx={{ mb: 3 }} />

            {/* The Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Use realtime validation as well as confirmation dialog
                if (isValidForm()) setOpenConfirmation(true);
              }}
            >
              <Grid container spacing={3} direction="row">
                <Grid item xs={12} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Basic &amp; Employment Information
                  </Typography>

                  <Grid container spacing={2}>
                    {/* Full Name */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Full Name"
                        variant="outlined"
                        fullWidth
                        name="FullName"
                        value={newStaff.FullName}
                        onChange={handleInputChange}
                        error={!!errors.FullName}
                        helperText={errors.FullName}
                        required
                        inputRef={fullNameRef}
                        onKeyDown={(e) => handleKeyDown(e, emailRef)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Email */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Email"
                        variant="outlined"
                        type="email"
                        fullWidth
                        name="Email"
                        value={newStaff.Email}
                        onChange={handleInputChange}
                        error={!!errors.Email}
                        helperText={errors.Email}
                        required
                        inputRef={emailRef}
                        onKeyDown={(e) => handleKeyDown(e, phoneRef)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Phone */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Phone"
                        variant="outlined"
                        fullWidth
                        name="Phone"
                        value={newStaff.Phone}
                        onChange={handleInputChange}
                        inputRef={phoneRef}
                        onKeyDown={(e) => handleKeyDown(e, roleRef)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Role */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Role"
                        variant="outlined"
                        fullWidth
                        name="Role"
                        value={newStaff.Role}
                        onChange={handleInputChange}
                        inputRef={roleRef}
                        onKeyDown={(e) => handleKeyDown(e, branchRef)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <WorkIcon />
                            </InputAdornment>
                          ),
                        }}
                      >
                        <MenuItem value="">
                          <em>-- Select Role --</em>
                        </MenuItem>
                        <MenuItem value="Gym">Gym</MenuItem>
                        <MenuItem value="Yogurt">Yogurt</MenuItem>
                        <MenuItem value="Cafe">Cafe</MenuItem>
                      </TextField>
                    </Grid>

                    {/* Branch Select */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Branch"
                        variant="outlined"
                        fullWidth
                        name="BranchID"
                        value={newStaff.BranchID}
                        onChange={handleInputChange}
                        error={!!errors.BranchID}
                        helperText={errors.BranchID}
                        inputRef={branchRef}
                        onKeyDown={(e) => handleKeyDown(e, dateHiredRef)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <StoreIcon />
                            </InputAdornment>
                          ),
                        }}
                      >
                        <MenuItem value="">
                          <em>-- Select Branch --</em>
                        </MenuItem>
                        {branches.map((b) => (
                          <MenuItem key={b.BranchID} value={b.BranchID}>
                            {b.BranchName}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {/* Date Hired */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Date Hired"
                        variant="outlined"
                        fullWidth
                        name="DateHired"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={newStaff.DateHired}
                        onChange={handleInputChange}
                        inputRef={dateHiredRef}
                        onKeyDown={(e) => handleKeyDown(e, dailyRateRef)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <DateRangeIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Daily Rate */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Daily Rate"
                        variant="outlined"
                        fullWidth
                        name="DailyRate"
                        type="number"
                        value={newStaff.DailyRate}
                        onChange={handleInputChange}
                        inputRef={dailyRateRef}
                        onKeyDown={(e) => handleKeyDown(e, notesRef)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Typography sx={{ fontWeight: "bold" }}>
                                ₱
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Hourly Rate (derived; read-only) */}
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Hourly Rate (auto)"
                        variant="outlined"
                        fullWidth
                        value={clientHourly}
                        disabled
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccessTimeIcon />
                            </InputAdornment>
                          ),
                        }}
                        helperText="Derived from DailyRate / 8"
                      />
                    </Grid>

                    {/* Overtime Rate (derived; read-only) */}
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="OT Rate (auto)"
                        variant="outlined"
                        fullWidth
                        value={clientOvertime}
                        disabled
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <TimelapseIcon />
                            </InputAdornment>
                          ),
                        }}
                        helperText="Hourly × 1.25"
                      />
                    </Grid>

                    {/* Additional Notes */}
                    <Grid item xs={12}>
                      <TextField
                        label="Additional Notes"
                        variant="outlined"
                        fullWidth
                        name="Notes"
                        value={newStaff.Notes}
                        onChange={handleInputChange}
                        multiline
                        rows={3}
                        inputRef={notesRef}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (isValidForm()) {
                              setOpenConfirmation(true);
                            }
                          }
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <StickyNote2Icon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              {/* Action Button Container */}
              <Box
                sx={{
                  mt: 4,
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setOpenConfirmation(true)}
                  sx={{ textTransform: "none" }}
                  disabled={!isSubmitEnabled}
                  ref={submitButtonRef}
                >
                  <SaveIcon sx={{ mr: 1 }} /> SUBMIT REGISTRATION
                </Button>
              </Box>
            </form>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Modern Confirmation Dialog */}
      <Dialog
        open={openConfirmation}
        onClose={handleConfirmNo}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 350 },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", p: 3 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <CheckCircleOutlineIcon sx={{ fontSize: 50, color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Confirm Submission
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ textAlign: "center", py: 2 }}>
          <Typography variant="body1">
            Are you sure you want to submit this registration?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", gap: 2, py: 2 }}>
          <Button
            onClick={handleConfirmNo}
            sx={{ textTransform: "none" }}
            style={{ color: "red" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{ textTransform: "none" }}
            onClick={handleConfirmYes}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for Success Message */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={6000}
        onClose={() => setSnackOpen(false)}
        message={snackMessage}
      />
    </>
  );
}
