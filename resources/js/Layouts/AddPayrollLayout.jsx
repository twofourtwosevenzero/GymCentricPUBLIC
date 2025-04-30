import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, FormControl, IconButton, Typography, Divider,
  useMediaQuery, useTheme, InputAdornment
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import DateRangeIcon from "@mui/icons-material/DateRange";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SaveIcon from "@mui/icons-material/Save";

const LATE_PESO_PER_MIN = 1; // 1 peso per minute

// Include "CashAdvance" in initial state
const initialPayroll = {
  StaffID: "",
  StartDate: "",
  EndDate: "",
  Deductions: "",   // user typed
  CashAdvance: "",  // new user typed
  GrossPay: "",     // computed
  NetPay: "",       // computed
  GeneratedDate: "",
  Status: "",
};

export default function AddPayrollLayout({ onClose, onAdd, staffOptions = [] }) {
  const [payrollData, setPayrollData] = useState(initialPayroll);
  const [errors, setErrors] = useState({});

  // Attendance & schedules
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [scheduleRecords, setScheduleRecords] = useState([]);
  const [attendanceFetched, setAttendanceFetched] = useState(false);
  const [noAttendanceMsg, setNoAttendanceMsg] = useState("");

  // For partial breakdown
  const [nightDiffHrs, setNightDiffHrs] = useState(0);
  const [nightDiffPay, setNightDiffPay] = useState(0);
  const [latePenalty, setLatePenalty] = useState(0);

  // For Autocomplete staff search
  const [query, setQuery] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Create refs for form fields
  const staffSearchRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const deductionsRef = useRef(null);
  const cashAdvanceRef = useRef(null);
  const generatedDateRef = useRef(null);
  const statusRef = useRef(null);
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

  // ─────────────────────────────────────────────────────────────────
  // A) Fetch Attendance in range
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { StaffID, StartDate, EndDate } = payrollData;
    setAttendanceFetched(false);

    if (!StaffID || !StartDate || !EndDate) {
      setAttendanceRecords([]);
      setNoAttendanceMsg("");
      return;
    }

    const startObj = new Date(StartDate);
    const endObj = new Date(EndDate);
    if (endObj < startObj) {
      setAttendanceRecords([]);
      setNoAttendanceMsg("End date cannot be before start date.");
      return;
    }

    axios
      .get(`/staff/${StaffID}/attendance-range`, {
        params: { start: StartDate, end: EndDate },
      })
      .then((res) => {
        const data = res.data;
        setAttendanceRecords(data);
        setAttendanceFetched(true);
        if (!data.length) {
          setNoAttendanceMsg("No attendance found in that date range.");
        } else {
          setNoAttendanceMsg("");
        }
      })
      .catch((err) => {
        console.error("Error fetching attendance range:", err);
        setNoAttendanceMsg("Error fetching attendance. Check console.");
        setAttendanceRecords([]);
      });
  }, [payrollData.StaffID, payrollData.StartDate, payrollData.EndDate]);

  // ─────────────────────────────────────────────────────────────────
  // B) (Optional) Fetch Schedules if you want them in the UI
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { StaffID, StartDate, EndDate } = payrollData;
    if (!StaffID || !StartDate || !EndDate) {
      setScheduleRecords([]);
      return;
    }
    axios
      .get(`/staff/schedules/${StaffID}/schedule-range`, {
        params: { start: StartDate, end: EndDate },
      })
      .then((res) => {
        setScheduleRecords(res.data);
      })
      .catch((err) => {
        console.error("Error fetching schedule range:", err);
        setScheduleRecords([]);
      });
  }, [payrollData.StaffID, payrollData.StartDate, payrollData.EndDate]);

  // ─────────────────────────────────────────────────────────────────
  // C) Compute Pay (with ND & Late) once attendance is fetched
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!attendanceFetched) return;

    const selectedStaff = staffOptions.find(
      (s) => s.value === payrollData.StaffID
    );
    if (!selectedStaff) return;

    const hourlyRate = parseFloat(selectedStaff.hourlyRate) || 0;
    const overtimeRate = parseFloat(selectedStaff.overtimeRate) || 0;
    const nightDiffRate = hourlyRate * 0.1; // 10% of hourly

    let totalReg = 0;
    let totalOT = 0;
    let totalND = 0;
    let totalLate = 0;

    attendanceRecords.forEach((att) => {
      const hrs = parseFloat(att.HoursWorked) || 0;
      // storePayroll logic => min(hrs,8)
      totalReg += Math.min(hrs, 8);

      const possibleOT = hrs > 8 ? hrs - 8 : 0;
      const approvedOT = parseFloat(att.OvertimeHours) || 0;
      totalOT += Math.min(possibleOT, approvedOT);

      totalLate += parseFloat(att.LateMinutes) || 0;
      totalND   += parseFloat(att.NightDiffHours) || 0;
    });

    const regularPay = totalReg * hourlyRate;
    const otPay      = totalOT * overtimeRate;
    const ndPay      = totalND * nightDiffRate;
    const gross = regularPay + otPay + ndPay;

    // sum user Deductions + late penalty + cashAdvance
    let userDeductions = parseFloat(payrollData.Deductions);
    if (isNaN(userDeductions)) userDeductions = 0;

    let userCA = parseFloat(payrollData.CashAdvance);
    if (isNaN(userCA)) userCA = 0;

    const latePay = totalLate * LATE_PESO_PER_MIN; 
    const combined = userDeductions + latePay + userCA;

    const net = gross - combined;

    setNightDiffHrs(totalND);
    setNightDiffPay(ndPay.toFixed(2));
    setLatePenalty(latePay);

    setPayrollData((prev) => ({
      ...prev,
      GrossPay: Number.isFinite(gross) ? gross.toFixed(2) : "0.00",
      NetPay: Number.isFinite(net) ? net.toFixed(2) : "0.00",
    }));
  }, [
    attendanceFetched,
    attendanceRecords,
    payrollData.Deductions,
    payrollData.CashAdvance,  // watch for changes here!
    payrollData.StaffID,
    staffOptions,
  ]);

  // ─────────────────────────────────────────────────────────────────
  // D) Handlers
  // ─────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setPayrollData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // 1) Validate staff
    const selectedStaff = staffOptions.find(
      (s) => s.value === payrollData.StaffID
    );
    if (!selectedStaff) {
      setErrors({ StaffID: "No matching staff found or staff is required." });
      return;
    }

    // 2) Validate attendance presence
    if (!attendanceRecords.length) {
      alert("Cannot create payroll: No attendance in this date range.");
      return;
    }

    // 3) Final payload => pass to parent
    const payload = {
      StaffID: selectedStaff.value,
      StartDate: payrollData.StartDate,
      EndDate: payrollData.EndDate,
      Deductions: parseFloat(payrollData.Deductions) || 0,
      CashAdvance: parseFloat(payrollData.CashAdvance) || 0, // new
      GrossPay: parseFloat(payrollData.GrossPay) || 0,
      NetPay: parseFloat(payrollData.NetPay) || 0,
      GeneratedDate: payrollData.GeneratedDate || null,
      Status: payrollData.Status || "Pending",
    };

    onAdd(payload);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            <Typography
              component="span"
              sx={{ fontWeight: "bold", verticalAlign: "middle", mr: 1 }}
            >
              ₱
            </Typography>
            Add Payroll
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ p: 2 }}>
          <Divider sx={{ mb: 3 }} />

          <Box component="form" noValidate onSubmit={handleSubmit}>
            <Grid container spacing={2} direction={isMobile ? "column" : "row"}>
              {/* Staff Autocomplete */}
              <Grid item xs={12}>
                <FormControl fullWidth required error={!!errors.StaffID}>
                  <Autocomplete
                    options={staffOptions}
                    getOptionLabel={(opt) => opt.label}
                    inputValue={query}
                    onInputChange={(e, val) => setQuery(val)}
                    onChange={(e, val) => {
                      if (val) {
                        setPayrollData((prev) => ({
                          ...prev,
                          StaffID: val.value,
                        }));
                        setErrors((prev) => ({ ...prev, StaffID: undefined }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search Staff"
                        variant="outlined"
                        error={!!errors.StaffID}
                        helperText={errors.StaffID}
                        inputRef={staffSearchRef}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            startDateRef.current.focus();
                          }
                        }}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Start/End Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="StartDate"
                  label="Start Date"
                  type="date"
                  value={payrollData.StartDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  inputRef={startDateRef}
                  onKeyDown={(e) => handleKeyDown(e, endDateRef)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DateRangeIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="EndDate"
                  label="End Date"
                  type="date"
                  value={payrollData.EndDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  inputRef={endDateRef}
                  onKeyDown={(e) => handleKeyDown(e, deductionsRef)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DateRangeIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Deductions */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="Deductions"
                  label="Manual Deductions"
                  type="number"
                  value={payrollData.Deductions}
                  onChange={handleChange}
                  inputRef={deductionsRef}
                  onKeyDown={(e) => handleKeyDown(e, cashAdvanceRef)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Cash Advance */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="CashAdvance"
                  label="Cash Advance"
                  type="number"
                  value={payrollData.CashAdvance}
                  onChange={handleChange}
                  inputRef={cashAdvanceRef}
                  onKeyDown={(e) => handleKeyDown(e, generatedDateRef)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Late Penalty (read-only) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Late Penalty"
                  type="text"
                  value={latePenalty.toFixed(2)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                    readOnly: true,
                  }}
                />
              </Grid>

              {/* Night Diff Hours & Pay */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Night Diff Hours"
                  type="text"
                  value={nightDiffHrs.toFixed(2)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Night Diff Pay"
                  type="text"
                  value={nightDiffPay}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                    readOnly: true,
                  }}
                />
              </Grid>

              {/* GrossPay (computed) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="GrossPay"
                  label="Gross Pay"
                  type="number"
                  value={payrollData.GrossPay}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                    readOnly: true,
                  }}
                />
              </Grid>

              {/* NetPay (computed) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="NetPay"
                  label="Net Pay"
                  type="number"
                  value={payrollData.NetPay}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">₱</InputAdornment>
                    ),
                    readOnly: true,
                  }}
                />
              </Grid>

              {/* GeneratedDate */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Generated Date"
                  name="GeneratedDate"
                  type="date"
                  value={payrollData.GeneratedDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  inputRef={generatedDateRef}
                  onKeyDown={(e) => handleKeyDown(e, statusRef)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DateRangeIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Status */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Status"
                  name="Status"
                  value={payrollData.Status}
                  onChange={handleChange}
                  inputRef={statusRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitButtonRef.current.click();
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PendingActionsIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            {noAttendanceMsg && (
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                {noAttendanceMsg}
              </Typography>
            )}

            <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                ref={submitButtonRef}
                disabled={
                  !payrollData.StaffID ||
                  !payrollData.StartDate ||
                  !payrollData.EndDate ||
                  !payrollData.GrossPay ||
                  payrollData.GrossPay < 0 ||
                  !payrollData.NetPay ||
                  payrollData.NetPay < 0 ||
                  !payrollData.GeneratedDate ||
                  !payrollData.Status ||
                  !!noAttendanceMsg
                }
              >
                Submit Payroll
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
