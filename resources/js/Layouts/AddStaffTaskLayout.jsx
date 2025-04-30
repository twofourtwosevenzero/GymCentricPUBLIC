import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import DescriptionIcon from "@mui/icons-material/Description";
import EventIcon from "@mui/icons-material/Event";
import InfoIcon from "@mui/icons-material/Info";

const initialTask = {
  StaffID: "",
  TaskDescription: "",
  TaskDate: "",
  Status: "Pending",
};

export default function AddStaffTaskLayout({ onClose, onAdd, staffOptions }) {
  const [taskData, setTaskData] = useState(initialTask);
  const [errors, setErrors] = useState({});

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskData.StaffID || !taskData.TaskDescription) {
      setErrors({
        StaffID: taskData.StaffID ? "" : "Staff ID is required",
        TaskDescription: taskData.TaskDescription ? "" : "Description is required",
      });
      return;
    }
    onAdd(taskData);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          boxShadow: 6,
          p: 3,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            <PersonIcon sx={{verticalAlign: "middle", mr: 1}} />
            Add Staff Task
          </Typography>
          <IconButton onClick={onClose} sx={{ "&:hover": { color: theme.palette.error.main } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            {/* Staff Dropdown with Person Icon */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Staff"
                name="StaffID"
                value={taskData.StaffID}
                onChange={handleChange}
                variant="outlined"
                required
                error={!!errors.StaffID}
                helperText={errors.StaffID}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">
                  <em>-- Select Staff --</em>
                </MenuItem>
                {staffOptions.map((staff) => (
                  <MenuItem key={staff.value} value={staff.value}>
                    {staff.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Task Description with Description Icon */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Task Description"
                name="TaskDescription"
                value={taskData.TaskDescription}
                onChange={handleChange}
                error={!!errors.TaskDescription}
                helperText={errors.TaskDescription}
                variant="outlined"
                required
                multiline
                rows={3}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DescriptionIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Task Date with Event Icon */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Task Date"
                name="TaskDate"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={taskData.TaskDate}
                onChange={handleChange}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EventIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Status with Info Icon */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Status"
                name="Status"
                value={taskData.Status}
                onChange={handleChange}
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <InfoIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "flex-end", gap: 2, py: 2, px: 3 }}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          sx={{
            px: 4,
            py: 1,

            textTransform: "none",
          }}
          startIcon={<AddIcon />}
          disabled={
            !taskData.StaffID ||
            !taskData.TaskDescription.trim() ||
            !taskData.TaskDate ||
            !taskData.Status.trim()
          }
        >
          ADD TASK
        </Button>
      </DialogActions>

    </Dialog>
  );
}
