import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Divider,
  Paper,
  TextField,
  Button,
  Grid,
  IconButton,
  InputAdornment
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import axios from "axios";

export default function EditProfile() {
  const [userId, setUserId] = useState(null); // Store ID (AdminID, OwnerID, or StaffID)
  const [userRole, setUserRole] = useState(""); // Store Role (Admin, Owner, or Staff)
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/profile");
        if (res.data) {
          setUserEmail(res.data.Email || "");

          // Identify user type and store the correct ID
          if (res.data.AdminID) {
            setUserId(res.data.AdminID);
            setUserRole("admin");
          } else if (res.data.OwnerID) {
            setUserId(res.data.OwnerID);
            setUserRole("owner");
          } else if (res.data.StaffID) {
            setUserId(res.data.StaffID);
            setUserRole("staff");
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const handleToggleShowNewPass = () => setShowNewPass((prev) => !prev);
  const handleToggleShowConfirmPass = () => setShowConfirmPass((prev) => !prev);

  const handleSaveMyAccount = async () => {
    if (!userId) {
      alert("Error: User ID not found.");
      return;
    }

    if (newPassword && newPassword !== confirmPass) {
      alert("New Password and Confirm Password do not match!");
      return;
    }

    try {
      await axios.put("/profile", {
        id: userId, // Send correct ID
        email: userEmail.trim(),
        password: newPassword.trim() || null,
      });

      alert("Your account changes have been saved!");
      setNewPassword("");
      setConfirmPass("");
    } catch (error) {
      console.error("Failed to update account:", error.response?.data);
      alert("Error updating your account.");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Edit Profile
      </Typography>
      <Divider sx={{ mb: 3 }} />

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
                ),
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
                ),
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
    </Box>
  );
}
