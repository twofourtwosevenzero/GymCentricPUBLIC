// File: EditProfile.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Divider,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Snackbar
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import StoreIcon from "@mui/icons-material/Store";
import WorkIcon from "@mui/icons-material/Work";
import DateRangeIcon from "@mui/icons-material/DateRange";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TimelapseIcon from "@mui/icons-material/Timelapse";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import axios from "axios";

const roleOptions = ["Staff", "Admin", "Owner"];

export default function EditProfile() {
  // ------------------ MY ACCOUNT (CURRENT USER) ------------------
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/profile");
        setUserEmail(res.data.email);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const handleToggleShowNewPass = () => setShowNewPass((prev) => !prev);
  const handleToggleShowConfirmPass = () => setShowConfirmPass((prev) => !prev);

  const handleSaveMyAccount = async () => {
    if (newPassword && newPassword !== confirmPass) {
      alert("New Password and Confirm Password do not match!");
      return;
    }
    try {
      const payload = { email: userEmail.trim() };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
        payload.password_confirmation = confirmPass.trim();
      }
      await axios.put("/profile", payload);
      alert("Your account changes have been saved!");
      setNewPassword("");
      setConfirmPass("");
    } catch (error) {
      console.error("Failed to update account:", error);
      alert("Error updating your account. Check console.");
    }
  };

  // ------------------ ADD / CREATE NEW STAFF, ADMIN, or OWNER ------------------
  const [isAddStaffOpen, setAddStaffOpen] = useState(false);

  // Staff/Admin data state
  const [staffData, setStaffData] = useState({
    FullName: "",
    Email: "",
    Phone: "",
    Role: "Staff",
    BranchID: "",
    BranchIDs: [],
    DateHired: "",
    DailyRate: "",
    HourlyRate: "",
    OvertimeRate: "",
    Notes: "",
    password: "",
    confirmPassword: ""
  });

  // For branch selection
  const [branchOptions, setBranchOptions] = useState([]);

  // Client-side validation errors
  const [staffErrors, setStaffErrors] = useState({});
  // For any server 422 errors
  const [apiErrors, setApiErrors] = useState({});

  // Snackbar
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");

  // Show/hide password icons
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [showStaffConfirmPassword, setShowStaffConfirmPassword] = useState(false);
  const handleToggleShowStaffPassword = () => setShowStaffPassword((prev) => !prev);
  const handleToggleShowStaffConfirmPassword = () =>
    setShowStaffConfirmPassword((prev) => !prev);

  useEffect(() => {
    // Load branches for staff selection
    const loadBranches = async () => {
      try {
        const res = await axios.get("/owner/branches");
        const branchesData = res.data.branches || res.data;
        const formattedBranches = branchesData.map((branch) => ({
          BranchID: branch.BranchID || branch.id,
          BranchName: branch.BranchName || branch.name
        }));
        setBranchOptions(formattedBranches);
      } catch (err) {
        console.error("Error loading branches:", err);
        alert("Failed to load branches from server.");
      }
    };
    loadBranches();
  }, []);

  // Open the dialog
  const handleOpenAddStaff = () => {
    setStaffData({
      FullName: "",
      Email: "",
      Phone: "",
      Role: "Staff",
      BranchID: "",
      BranchIDs: [],
      DateHired: "",
      DailyRate: "",
      HourlyRate: "",
      OvertimeRate: "",
      Notes: "",
      password: "",
      confirmPassword: ""
    });
    setApiErrors({});
    setStaffErrors({});
    setAddStaffOpen(true);
  };

  // Handler for field changes
  const handleStaffDataChange = (field, value) => {
    setStaffData((prev) => ({
      ...prev,
      [field]: value
    }));
    setStaffErrors((prevErrors) => ({
      ...prevErrors,
      [field]: undefined
    }));
  };

  // Client-side validation
  const validateStaffData = () => {
    const errors = {};
    if (!staffData.FullName.trim()) {
      errors.FullName = "Full Name is required.";
    }
    if (!staffData.Email.trim()) {
      errors.Email = "Email is required.";
    }
    if (staffData.password.trim() || staffData.confirmPassword.trim()) {
      if (staffData.password.trim() !== staffData.confirmPassword.trim()) {
        errors.confirmPassword = "Passwords do not match.";
      }
    }
    // For staff or admin => branch required (if that's your logic)
    if ((staffData.Role === "Staff" || staffData.Role === "Admin") && !staffData.BranchID) {
      errors.BranchID = `Please select a branch for ${staffData.Role}.`;
    }
    return errors;
  };

  // This is an optional check if you want to ensure unique names
  const checkDuplicateFullName = async (fullName) => {
    try {
      const res = await axios.get("/staff/exists", {
        params: { fullname: fullName.trim() }
      });
      return res.data.exists;
    } catch (error) {
      console.error("Error checking duplicate full name:", error);
      return false;
    }
  };
  const handleAddStaff = async () => {
    // 1) Client-side validate
    const errors = validateStaffData();
    if (Object.keys(errors).length > 0) {
      setStaffErrors(errors);
      return;
    }
    // 2) (Optionally) check duplicate FullName
    const isDuplicate = await checkDuplicateFullName(staffData.FullName);
    if (isDuplicate) {
      setStaffErrors((prev) => ({
        ...prev,
        FullName: "Full Name already exists."
      }));
      // Also show an error snack message
      setSnackMessage("Error: Full Name already exists.");
      setSnackOpen(true);
      return;
    }
    setStaffErrors({});
  
    // 3) Build the payload
    const payload = {
      FullName: staffData.FullName.trim(),
      Email: staffData.Email.trim(),
      Phone: staffData.Phone.trim(),
      Role: staffData.Role,
      Notes: staffData.Notes.trim() || null,
      password: staffData.password.trim() || null,
      password_confirmation: staffData.confirmPassword.trim() || null
    };
  
    if (staffData.Role === "Staff" || staffData.Role === "Admin") {
      payload.BranchID = staffData.BranchID;
      if (staffData.Role === "Staff") {
        payload.DateHired    = staffData.DateHired || null;
        payload.DailyRate    = staffData.DailyRate || null;
        payload.HourlyRate   = staffData.HourlyRate || null;
        payload.OvertimeRate = staffData.OvertimeRate || null;
      }
    }
  
    // 4) Decide endpoint
    let endpoint = "/staff"; 
    if (staffData.Role === "Admin") {
      endpoint = "/admin"; 
    }
    // Optionally, if Owner should be routed elsewhere, adjust here.
  
    try {
      const res = await axios.post(endpoint, payload);
      setSnackMessage(`New ${staffData.Role} created: ${res.data.FullName}`);
      setSnackOpen(true);
      setAddStaffOpen(false);
    } catch (err) {
      console.error("Failed to create user:", err);
      let errorMsg = "Error creating user. Check console for details.";
      if (err.response) {
        errorMsg = err.response.data.message || errorMsg;
        // Optionally set API errors for further display
        if (err.response.status === 422) {
          setApiErrors(err.response.data.errors || {});
        }
      }
      setSnackMessage(errorMsg);
      setSnackOpen(true);
    }
  };
  

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Edit Profile & Manage Staff
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* MY ACCOUNT SECTION */}
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          My Account
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email Address"
              variant="outlined"
              fullWidth
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              sx={{ mt: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="New Password"
              variant="outlined"
              fullWidth
              type={showNewPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ mt: 1 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleToggleShowNewPass}>
                      {showNewPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Confirm New Password"
              variant="outlined"
              fullWidth
              type={showConfirmPass ? "text" : "password"}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleToggleShowConfirmPass}>
                      {showConfirmPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
        </Grid>
        <Box sx={{ textAlign: "right", mt: 2 }}>
          <Button variant="contained" color="primary" onClick={handleSaveMyAccount}>
            Save My Account
          </Button>
        </Box>
      </Paper>

      {/* CREATE STAFF / ADMIN / OWNER SECTION */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Add New Staff / Admin / Owner
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Create a new user with the appropriate role and branch.
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddStaff}>
          Create Staff Branch Account
        </Button>
      </Paper>

      {/* ADD USER (STAFF/ADMIN) DIALOG */}
      <Dialog
        open={isAddStaffOpen}
        onClose={() => setAddStaffOpen(false)}
        fullWidth
        maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 3,
            boxShadow: 6,
            p: 3,
            overflow: "hidden"
          }
        }}
      >
        <DialogTitle sx={{ p: 2 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PersonAddIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Create {staffData.Role} Branch Account
              </Typography>
            </Box>
            <IconButton
              onClick={() => setAddStaffOpen(false)}
              sx={{ "&:hover": { color: "red" } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 4 }}>
          <Grid container spacing={2}>
            {/* Full Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Full Name"
                variant="outlined"
                fullWidth
                value={staffData.FullName}
                onChange={(e) => handleStaffDataChange("FullName", e.target.value)}
                error={!!staffErrors.FullName}
                helperText={staffErrors.FullName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                value={staffData.Email}
                onChange={(e) => handleStaffDataChange("Email", e.target.value)}
                error={!!staffErrors.Email}
                helperText={staffErrors.Email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Password */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Password"
                variant="outlined"
                fullWidth
                type={showStaffPassword ? "text" : "password"}
                value={staffData.password}
                onChange={(e) => handleStaffDataChange("password", e.target.value)}
                error={!!staffErrors.password}
                helperText={staffErrors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleToggleShowStaffPassword}>
                        {showStaffPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Confirm Password */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirm Password"
                variant="outlined"
                fullWidth
                type={showStaffConfirmPassword ? "text" : "password"}
                value={staffData.confirmPassword}
                onChange={(e) => handleStaffDataChange("confirmPassword", e.target.value)}
                error={!!staffErrors.confirmPassword}
                helperText={staffErrors.confirmPassword}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleToggleShowStaffConfirmPassword}>
                        {showStaffConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Phone */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                variant="outlined"
                fullWidth
                value={staffData.Phone}
                onChange={(e) => handleStaffDataChange("Phone", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Role */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={staffData.Role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setStaffData((prev) => ({
                      ...prev,
                      Role: newRole,
                      BranchID: "",
                      BranchIDs: [],
                      DateHired: "",
                      DailyRate: "",
                      HourlyRate: "",
                      OvertimeRate: ""
                    }));
                    setApiErrors({});
                    setStaffErrors({});
                  }}
                  startAdornment={
                    <InputAdornment position="start">
                      <WorkIcon />
                    </InputAdornment>
                  }
                >
                  {roleOptions.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Branch (Hidden if Role=Owner, or if you want to hide for Admin) */}
            {(staffData.Role === "Staff" || staffData.Role === "Admin") && (
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  variant="outlined"
                  error={!!staffErrors.BranchID}
                >
                  <InputLabel>Select Branch</InputLabel>
                  <Select
                    label="Select Branch"
                    value={staffData.BranchID}
                    onChange={(e) => handleStaffDataChange("BranchID", e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <StoreIcon />
                      </InputAdornment>
                    }
                  >
                    {branchOptions.map((b) => (
                      <MenuItem key={b.BranchID} value={b.BranchID}>
                        {b.BranchName}
                      </MenuItem>
                    ))}
                  </Select>
                  {staffErrors.BranchID && (
                    <Typography variant="caption" color="error">
                      {staffErrors.BranchID}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            )}

            {/* Additional Notes */}
            <Grid item xs={12}>
              <TextField
                label="Additional Notes"
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={staffData.Notes}
                onChange={(e) => handleStaffDataChange("Notes", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <StickyNote2Icon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddStaff}
            sx={{ textTransform: "none" }}
          >
            <PersonAddIcon sx={{ mr: 1 }} /> Create {staffData.Role}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for success or error messages */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={6000}
        onClose={() => setSnackOpen(false)}
        message={snackMessage}
      />
    </Box>
  );
}
