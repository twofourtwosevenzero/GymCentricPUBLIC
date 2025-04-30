import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Alert,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";
import { route } from "ziggy-js";

export default function AddScheduleLayout({
  onClose,
  staffOptions = [],
  onSchedulesCreated,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Basic form state
  const [staffID, setStaffID] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [shiftType, setShiftType] = useState("morning");
  const [dynamicStart, setDynamicStart] = useState("");
  const [dynamicEnd, setDynamicEnd] = useState("");

  // Toggles for auto-exclusion
  const [excludeSaturdays, setExcludeSaturdays] = useState(false);
  const [excludeSundays, setExcludeSundays] = useState(false);
  const [excludeHolidays, setExcludeHolidays] = useState(false);

  // Final date list => array of { date: 'YYYY-MM-DD', checked: true/false }
  const [scheduleDates, setScheduleDates] = useState([]);

  // For server validation errors
  const [errors, setErrors] = useState({});

  // Create refs for form fields
  const staffRef = useRef(null);
  const dateFromRef = useRef(null);
  const dateToRef = useRef(null);
  const shiftTypeRef = useRef(null);
  const dynamicStartRef = useRef(null);
  const dynamicEndRef = useRef(null);
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

  // 1) Generate date list whenever date range or toggles change
  useEffect(() => {
    if (!dateFrom || !dateTo) {
      setScheduleDates([]);
      return;
    }

    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (end < start) {
      setScheduleDates([]);
      return;
    }

    // Example "holiday" list
    const holidaySet = new Set(["2025-04-09", "2025-04-10"]);
    // ^ Adjust or fetch real data from your back end if needed

    const newDates = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      const iso = cursor.toISOString().split("T")[0];
      const dayOfWeek = cursor.getDay(); // 0=Sun, 1=Mon,...6=Sat

      // Skip Saturdays/Sundays/Holidays if toggled
      if (excludeSaturdays && dayOfWeek === 6) {
        // skip
      } else if (excludeSundays && dayOfWeek === 0) {
        // skip
      } else if (excludeHolidays && holidaySet.has(iso)) {
        // skip
      } else {
        // otherwise, include
        newDates.push({ date: iso, checked: true });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    setScheduleDates(newDates);
  }, [dateFrom, dateTo, excludeSaturdays, excludeSundays, excludeHolidays]);

  // 2) handleSubmit => only send the final "checked" dates
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // clear old errors

    if (!staffID || !dateFrom || !dateTo || !shiftType) {
      alert("Please fill in all required fields.");
      return;
    }
    if (new Date(dateTo) < new Date(dateFrom)) {
      alert("End date cannot be before Start date.");
      return;
    }

    // Filter only checked dates
    const selectedDates = scheduleDates
      .filter((dObj) => dObj.checked)
      .map((dObj) => dObj.date);

    if (!selectedDates.length) {
      alert("No days selected — nothing to schedule!");
      return;
    }

    // Build the payload
    const payload = {
      StaffID: staffID,
      shiftType,           // <-- CRITICAL: pass shiftType here
      startTime: dynamicStart,
      endTime: dynamicEnd,
      selectedDates,       // an array of 'YYYY-MM-DD'
    };

    try {
      // Suppose your back end has an endpoint that accepts `selectedDates` 
      // plus `shiftType` in the request
      const response = await axios.post(
        route("staff.schedules.bulkStoreCustom"), 
        payload
      );

      // If success => call parent's onSchedulesCreated
      if (onSchedulesCreated) {
        onSchedulesCreated(response.data);
      }
      onClose();
    } catch (err) {
      if (err.response && err.response.status === 422) {
        // Format: err.response.data.errors => { fieldName: [...], ... }
        setErrors(err.response.data.errors || {});
      } else {
        console.error("Error creating schedules:", err);
        alert("Something went wrong. Check console for details.");
      }
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            <AddIcon sx={{ mr: 1 }} />
            Add Schedules
          </Typography>
          <IconButton onClick={onClose} sx={{ "&:hover": { color: "red" } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Display server-side validation errors, if any */}
        {Object.keys(errors).length > 0 && (
          <Box sx={{ mb: 2 }}>
            {Object.entries(errors).map(([field, msgs]) => (
              <Alert severity="error" key={field} sx={{ mb: 1 }}>
                {msgs.join(" ")}
              </Alert>
            ))}
          </Box>
        )}

        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={2} direction={isMobile ? "column" : "row"}>
            {/* Staff */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.StaffID}>
                <InputLabel id="staff-select-label">Select Staff</InputLabel>
                <Select
                  labelId="staff-select-label"
                  label="Select Staff"
                  value={staffID}
                  onChange={(e) => setStaffID(e.target.value)}
                  inputRef={staffRef}
                  onKeyDown={(e) => handleKeyDown(e, dateFromRef)}
                >
                  {staffOptions.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date From"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                error={!!errors.dateFrom}
                helperText={errors.dateFrom?.[0] || ""}
                inputRef={dateFromRef}
                onKeyDown={(e) => handleKeyDown(e, dateToRef)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date To"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                error={!!errors.dateTo}
                helperText={errors.dateTo?.[0] || ""}
                inputRef={dateToRef}
                onKeyDown={(e) => handleKeyDown(e, shiftTypeRef)}
              />
            </Grid>

            {/* Shift Type */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.shiftType}>
                <InputLabel id="shift-select-label">Shift Type</InputLabel>
                <Select
                  labelId="shift-select-label"
                  label="Shift Type"
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value)}
                  inputRef={shiftTypeRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (shiftType === 'dynamic' && dynamicStartRef.current) {
                        dynamicStartRef.current.focus();
                      } else {
                        submitButtonRef.current.focus();
                      }
                    }
                  }}
                >
                  <MenuItem value="morning">Morning (5:30 AM - 2:30 PM)</MenuItem>
                  <MenuItem value="mid">Mid (10:00 AM - 7:00 PM)</MenuItem>
                  <MenuItem value="evening">Evening (3:00 PM - 11:59 PM)</MenuItem>
                  <MenuItem value="dynamic">Dynamic (Custom times)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* If shiftType === "dynamic", show Start/End fields */}
            {shiftType === "dynamic" && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    value={dynamicStart}
                    onChange={(e) => setDynamicStart(e.target.value)}
                    error={!!errors.startTime}
                    helperText={errors.startTime?.[0] || ""}
                    inputRef={dynamicStartRef}
                    onKeyDown={(e) => handleKeyDown(e, dynamicEndRef)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    value={dynamicEnd}
                    onChange={(e) => setDynamicEnd(e.target.value)}
                    error={!!errors.endTime}
                    helperText={errors.endTime?.[0] || ""}
                    inputRef={dynamicEndRef}
                    onKeyDown={(e) => handleKeyDown(e, submitButtonRef)}
                  />
                </Grid>
              </>
            )}

            {/* Auto-Exclusion Toggles */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeSaturdays}
                      onChange={(e) => setExcludeSaturdays(e.target.checked)}
                    />
                  }
                  label="Exclude Saturdays"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeSundays}
                      onChange={(e) => setExcludeSundays(e.target.checked)}
                    />
                  }
                  label="Exclude Sundays"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={excludeHolidays}
                      onChange={(e) => setExcludeHolidays(e.target.checked)}
                    />
                  }
                  label="Exclude Holidays"
                />
              </Box>
            </Grid>
          </Grid>

          {/* Generated Date List => Let user uncheck single days */}
          {scheduleDates.length > 0 && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                border: "1px solid #ccc",
                borderRadius: 2,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Select/Unselect Specific Dates:
              </Typography>
              {scheduleDates.map((dObj, idx) => (
                <FormControlLabel
                  key={dObj.date}
                  control={
                    <Checkbox
                      checked={dObj.checked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setScheduleDates((prev) => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], checked };
                          return copy;
                        });
                      }}
                    />
                  }
                  label={dObj.date}
                  sx={{ display: "block" }}
                />
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
          ref={submitButtonRef}
        >
          Save Schedules
        </Button>
      </DialogActions>
    </Dialog>
  );
}
