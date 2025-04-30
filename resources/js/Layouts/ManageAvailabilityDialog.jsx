import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Grid,
  List,
  ListItem,
  Divider,
  Paper,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import axios from "axios";

// MUI X date/time pickers
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";

const dayOptions = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

// Preset ranges for clarity and easy reference
const PRESET_RANGES = {
  "530-1430": { startHour: 5, startMin: 30, endHour: 14, endMin: 30 },
  "1000-1900": { startHour: 10, startMin: 0, endHour: 19, endMin: 0 },
  "1200-2100": { startHour: 12, startMin: 0, endHour: 21, endMin: 0 },
};

export default function ManageAvailabilityDialog({
  open,
  onClose,
  coach,
  onSave, // callback to refresh the coach data after changes
}) {
  // Existing availability
  const [availabilities, setAvailabilities] = useState([]);

  // Step 1: Days-of-week selection
  const [selectedDays, setSelectedDays] = useState([]);

  // Step 2: Time range (preset or custom)
  const [timeRangeType, setTimeRangeType] = useState("preset");
  const [presetValue, setPresetValue] = useState("530-1430");

  const [customStart, setCustomStart] = useState(dayjs().hour(5).minute(30));
  const [customEnd, setCustomEnd] = useState(dayjs().hour(14).minute(30));

  // Step 3: Date range pickers
  const [dateRangeStart, setDateRangeStart] = useState(dayjs()); // today's date by default
  const [dateRangeEnd, setDateRangeEnd] = useState(dayjs().add(7, "day")); // a week later

  // ----- Load existing availabilities on open -----
  useEffect(() => {
    if (open && coach?.availabilities) {
      setAvailabilities(coach.availabilities);
    }
  }, [open, coach]);

  // Format slot for display
  const formatSlot = (datetime) => {
    if (!datetime) return "—";
    const parsed = dayjs(datetime);
    return parsed.isValid() ? parsed.format("MMM D, YYYY h:mm A") : "Invalid";
  };

  // Toggle day-of-week checkboxes
  const handleDayChange = (dayValue) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((dv) => dv !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleAddTimeslots = async () => {
    if (!coach?.CoachID) return;

    if (selectedDays.length === 0) {
      window.alert("Please select at least one day of the week.");
      return;
    }

    // 1. Determine chosen start/end times
    let { startHour, startMin, endHour, endMin } =
      PRESET_RANGES[presetValue] || PRESET_RANGES["530-1430"];

    if (timeRangeType === "custom") {
      startHour = customStart.hour();
      startMin = customStart.minute();
      endHour = customEnd.hour();
      endMin = customEnd.minute();
    }

    // 2. Iterate from dateRangeStart to dateRangeEnd, day by day
    let currentDate = dateRangeStart.startOf("day");
    const finalDate = dateRangeEnd.endOf("day");

    const newSlots = [];

    try {
      while (
        currentDate.isBefore(finalDate, "day") ||
        currentDate.isSame(finalDate, "day")
      ) {
        if (selectedDays.includes(currentDate.day())) {
          const slotStart = currentDate
            .hour(startHour)
            .minute(startMin)
            .second(0);
          const slotEnd = currentDate.hour(endHour).minute(endMin).second(0);

          if (slotEnd.isAfter(slotStart)) {
            // Post to server
            const response = await axios.post(
              `/coaches/${coach.CoachID}/availabilities`,
              {
                Start: slotStart.format("YYYY-MM-DD HH:mm:ss"),
                End: slotEnd.format("YYYY-MM-DD HH:mm:ss"),
              }
            );
            if (response.data.availability) {
              newSlots.push(response.data.availability);
            }
          }
        }
        currentDate = currentDate.add(1, "day");
      }

      // Update local state
      setAvailabilities((prev) => [...prev, ...newSlots]);

      // In a real app, you might show a success snackbar or message
    } catch (err) {
      console.error("Error adding availability:", err);
      window.alert("Failed to add availability. Check console for details.");
    }
  };

  const handleDeleteAvailability = async (availabilityId) => {
    if (!coach?.CoachID) return;
    try {
      await axios.delete(`/coaches/${coach.CoachID}/availabilities/${availabilityId}`);
      setAvailabilities((prev) => prev.filter((av) => av.id !== availabilityId));
    } catch (err) {
      console.error("Error deleting availability:", err);
      window.alert("Failed to delete availability. Check console for details.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            Manage Availabilities: {coach?.FullName || "—"}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {!coach ? (
          <Typography variant="body1">No coach selected.</Typography>
        ) : (
          <>
            {/* Existing Timeslots */}
            <Typography variant="body2" sx={{ mb: 2 }}>
              Below are the timeslots representing this coach's availability.
            </Typography>

            <Paper variant="outlined" sx={{ p: 1, mb: 3 }}>
              {availabilities.length === 0 ? (
                <Typography variant="body2" sx={{ p: 2 }}>
                  No existing availability slots.
                </Typography>
              ) : (
                <List disablePadding>
                  {availabilities.map((slot, idx) => (
                    <React.Fragment key={slot.id}>
                      <ListItem
                        secondaryAction={
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => handleDeleteAvailability(slot.id)}
                          >
                            Delete
                          </Button>
                        }
                      >
                        <Typography variant="body2">
                          {formatSlot(slot.Start)} – {formatSlot(slot.End)}
                        </Typography>
                      </ListItem>
                      {idx < availabilities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>

            {/* Add New Timeslots */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Add New Timeslots
              </Typography>

              {/* Step A: Pick date range */}
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <DatePicker
                    label="From Date"
                    value={dateRangeStart}
                    onChange={(newVal) => {
                      if (newVal) setDateRangeStart(newVal);
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <DatePicker
                    label="To Date"
                    value={dateRangeEnd}
                    onChange={(newVal) => {
                      if (newVal) setDateRangeEnd(newVal);
                    }}
                  />
                </Grid>
              </Grid>

              {/* Step B: Pick days of week */}
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend">Which days?</FormLabel>
                <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                  {dayOptions.map((day) => (
                    <FormControlLabel
                      key={day.value}
                      label={day.label}
                      control={
                        <Checkbox
                          checked={selectedDays.includes(day.value)}
                          onChange={() => handleDayChange(day.value)}
                        />
                      }
                    />
                  ))}
                </Box>
              </FormControl>

              {/* Step C: Time range (preset or custom) */}
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <FormLabel component="legend">Pick a time range</FormLabel>
                <RadioGroup
                  row
                  value={timeRangeType}
                  onChange={(e) => setTimeRangeType(e.target.value)}
                >
                  <FormControlLabel
                    value="preset"
                    control={<Radio />}
                    label="Use a preset"
                  />
                  <FormControlLabel
                    value="custom"
                    control={<Radio />}
                    label="Custom range"
                  />
                </RadioGroup>
              </FormControl>

              {timeRangeType === "preset" && (
                <RadioGroup
                  row
                  value={presetValue}
                  onChange={(e) => setPresetValue(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <FormControlLabel
                    value="530-1430"
                    control={<Radio />}
                    label="5:30 AM - 2:30 PM"
                  />
                  <FormControlLabel
                    value="1000-1900"
                    control={<Radio />}
                    label="10:00 AM - 7:00 PM"
                  />
                  <FormControlLabel
                    value="1200-2100"
                    control={<Radio />}
                    label="12:00 PM - 9:00 PM"
                  />
                </RadioGroup>
              )}

              {timeRangeType === "custom" && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <TimePicker
                      label="Start Time"
                      value={customStart}
                      onChange={(newVal) => newVal && setCustomStart(newVal)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TimePicker
                      label="End Time"
                      value={customEnd}
                      onChange={(newVal) => newVal && setCustomEnd(newVal)}
                    />
                  </Grid>
                </Grid>
              )}

              {/* Step D: Click to create timeslots */}
              <Button variant="contained" onClick={handleAddTimeslots}>
                Add Timeslots
              </Button>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            onClose();
            if (onSave) onSave();
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
