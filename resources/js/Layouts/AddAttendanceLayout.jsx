import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { route } from "ziggy-js";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  FormHelperText,
  Typography
} from "@mui/material";

export default function AddAttendanceLayout({
  onClose,
  onAdd,
  staffOptions,
}) {
  const [staffID, setStaffID] = useState("");
  const [date, setDate] = useState("");

  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");

  const [hoursWorked, setHoursWorked] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");

  // For detecting staff's schedule:
  const [scheduleFound, setScheduleFound] = useState(false);
  const [scheduleShiftStart, setScheduleShiftStart] = useState(null);
  const [scheduleShiftEnd, setScheduleShiftEnd] = useState(null);

  // Computed "Late" data
  const [lateMinutes, setLateMinutes] = useState(0);

  // Optional: track errors for basic validation
  const [errors, setErrors] = useState({});

  // Create refs for form fields
  const staffRef = useRef(null);
  const dateRef = useRef(null);
  const timeInRef = useRef(null);
  const timeOutRef = useRef(null);
  const hoursWorkedRef = useRef(null);
  const overtimeHoursRef = useRef(null);
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

  // 1) **Fetch the day's schedule** if staff + date
  useEffect(() => {
    if (!staffID || !date) {
      setScheduleFound(false);
      setScheduleShiftStart(null);
      setScheduleShiftEnd(null);
      return;
    }

    const url = route("staff.schedules.range", staffID) + `?start=${date}&end=${date}`;
    axios
      .get(url)
      .then((res) => {
        const schedules = res.data; // array
        if (schedules.length > 0) {
          const schedule = schedules[0];
          setScheduleFound(true);

          // Convert e.g. "05:30" -> "05:30:00" if needed
          let start = schedule.ShiftStart || "";
          if (start && !start.endsWith(":00")) {
            start += ":00";
          }
          let end = schedule.ShiftEnd || "";
          if (end && !end.endsWith(":00")) {
            end += ":00";
          }

          setScheduleShiftStart(start);
          setScheduleShiftEnd(end);

          // Optional auto-fill:
          if (start) setTimeIn(start);
          if (end) setTimeOut(end);

        } else {
          // No schedule
          setScheduleFound(false);
          setScheduleShiftStart(null);
          setScheduleShiftEnd(null);
        }
      })
      .catch((err) => {
        console.error("Error fetching schedule for chosen date:", err);
        setScheduleFound(false);
        setScheduleShiftStart(null);
        setScheduleShiftEnd(null);
      });
  }, [staffID, date]);

  // 2) Auto-calc HoursWorked if timeIn & timeOut
  useEffect(() => {
    if (timeIn && timeOut) {
      // Ensure timeOut > timeIn
      const [inHour, inMin, inSec = 0] = timeIn.split(":").map(Number);
      const [outHour, outMin, outSec = 0] = timeOut.split(":").map(Number);

      const inDate = new Date(0, 0, 0, inHour, inMin, inSec);
      const outDate = new Date(0, 0, 0, outHour, outMin, outSec);

      if (outDate <= inDate) {
        setHoursWorked("");
      } else {
        const diffMs = outDate - inDate; // ms difference
        const diffHrs = diffMs / (1000 * 3600);
        setHoursWorked(diffHrs.toFixed(2));
      }
    } else {
      setHoursWorked("");
    }
  }, [timeIn, timeOut]);

  // 3) Compute LateMinutes if schedule found
  //    If timeIn > (ShiftStart + 10min), late = difference in minutes
  useEffect(() => {
    if (!scheduleShiftStart || !timeIn) {
      setLateMinutes(0);
      return;
    }

    // Convert scheduleShiftStart => date obj
    const [schH, schM, schS = 0] = scheduleShiftStart.split(":").map(Number);
    const scheduleDate = new Date(0, 0, 0, schH, schM, schS);
    const graceDate = new Date(scheduleDate.getTime() + 10 * 60 * 1000); // +10 min

    // Convert timeIn => date obj
    const [inH, inM, inS = 0] = timeIn.split(":").map(Number);
    const inDate = new Date(0, 0, 0, inH, inM, inS);

    if (inDate > graceDate) {
      const diffMs = inDate - graceDate;
      const diffMins = Math.floor(diffMs / 1000 / 60);
      setLateMinutes(diffMins);
    } else {
      setLateMinutes(0);
    }
  }, [scheduleShiftStart, timeIn]);

  // 4) Submit => minimal validation => call parent
  const handleSubmit = () => {
    setErrors({});

    let newErrors = {};
    if (!staffID) newErrors.staffID = "Staff is required.";
    if (!date) newErrors.date = "Date is required.";
    if (timeIn && timeOut) {
      // timeOut must be after timeIn
      if (timeOut <= timeIn) {
        newErrors.timeOut = "TimeOut must be after TimeIn.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build final payload
    const payload = {
      StaffID: staffID,
      Date: date,
      TimeIn: timeIn || null,
      TimeOut: timeOut || null,
      HoursWorked: hoursWorked ? parseFloat(hoursWorked) : 0,
      OvertimeHours: overtimeHours ? parseFloat(overtimeHours) : 0,
      LateMinutes: lateMinutes,
    };

    onAdd(payload);
  };

  return (
    <Dialog open={true} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Attendance</DialogTitle>

      <DialogContent
        dividers
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {/* STAFF */}
        <FormControl fullWidth error={!!errors.staffID}>
          <InputLabel>Staff</InputLabel>
          <Select
            label="Staff"
            value={staffID}
            onChange={(e) => setStaffID(e.target.value)}
            inputRef={staffRef}
            onKeyDown={(e) => handleKeyDown(e, dateRef)}
          >
            <MenuItem value="">Select staff</MenuItem>
            {staffOptions.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
          {errors.staffID && (
            <FormHelperText>{errors.staffID}</FormHelperText>
          )}
        </FormControl>

        {/* DATE */}
        <TextField
          label="Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={!!errors.date}
          helperText={errors.date}
          fullWidth
          inputRef={dateRef}
          onKeyDown={(e) => handleKeyDown(e, timeInRef)}
        />

        {/* TIME IN */}
        <TextField
          label="Time In"
          type="time"
          InputLabelProps={{ shrink: true }}
          value={timeIn}
          onChange={(e) => {
            let val = e.target.value; 
            if (val && !val.endsWith(":00")) {
              val += ":00";
            }
            setTimeIn(val);
          }}
          fullWidth
          inputRef={timeInRef}
          onKeyDown={(e) => handleKeyDown(e, timeOutRef)}
        />

        {/* TIME OUT */}
        <TextField
          label="Time Out"
          type="time"
          InputLabelProps={{ shrink: true }}
          value={timeOut}
          onChange={(e) => {
            let val = e.target.value;
            if (val && !val.endsWith(":00")) {
              val += ":00";
            }
            setTimeOut(val);
          }}
          error={!!errors.timeOut}
          helperText={errors.timeOut}
          fullWidth
          inputRef={timeOutRef}
          onKeyDown={(e) => handleKeyDown(e, hoursWorkedRef)}
        />

        {/* HOURS WORKED */}
        <TextField
          label="Hours Worked"
          type="number"
          value={hoursWorked}
          onChange={(e) => setHoursWorked(e.target.value)}
          fullWidth
          inputRef={hoursWorkedRef}
          onKeyDown={(e) => handleKeyDown(e, overtimeHoursRef)}
        />

        {/* OVERTIME HOURS */}
        <TextField
          label="Overtime Hours"
          type="number"
          value={overtimeHours}
          onChange={(e) => setOvertimeHours(e.target.value)}
          fullWidth
          inputRef={overtimeHoursRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitButtonRef.current.click();
            }
          }}
        />

        {/* Show schedule or not */}
        {staffID && date && !scheduleFound && (
          <FormHelperText sx={{ color: "orange" }}>
            No schedule found for this date.
          </FormHelperText>
        )}

        {/* Late Info if found a schedule */}
        {scheduleFound && lateMinutes > 0 && (
          <Typography sx={{ color: "red", mt: 1 }}>
            Late by {lateMinutes} minutes. (₱{lateMinutes} penalty if 1 peso/min)
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          ref={submitButtonRef}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
