import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  Snackbar,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Switch,
  Avatar,
  Chip,
  Alert
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Autocomplete from "@mui/material/Autocomplete";
import { DataGrid } from "@mui/x-data-grid";
import DashboardIcon from "@mui/icons-material/Dashboard";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import GroupIcon from "@mui/icons-material/Group";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import GroupsIcon from "@mui/icons-material/Groups";
import WarningIcon from "@mui/icons-material/Warning";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import HistoryIcon from "@mui/icons-material/History";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import BadgeIcon from "@mui/icons-material/Badge";
import EventIcon from "@mui/icons-material/Event";
import NotesIcon from "@mui/icons-material/Notes";
import CachedIcon from "@mui/icons-material/Cached";
import LockIcon from "@mui/icons-material/Lock";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import { AccessTime, AlarmOn, AlarmOff, Schedule as ScheduleIcon } from "@mui/icons-material";
import axios from "axios";
import dayjs from "dayjs";

// Instead of using jsQR and QrCodeWebcamDialog, we import our html5‑qrcode–based scanner:
import QrCodeScanner from "../../Components/QrCodeScanner";

import LockerManagement from "./LockerManagement";
import FingerprintScanner from "../../Components/FingerprintScanner";
import MemberAuthDialog from "../../Components/MemberAuthDialog";

export default function StaffDashboard() {
  const theme = useTheme();
  


  const [snackSeverity, setSnackSeverity] = useState("success");
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const getStatusChipProps = (statusName) => {
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
  }
  // Snackbar state
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const showSuccessMessage = (msg) => {
    setSnackSeverity("success"); // Reset severity to success
    setSnackMessage(msg);
    setSnackOpen(true);
  };
  
    // Current time (for display in the UI)
    const [currentTime, setCurrentTime] = useState(new Date());

  // Formatting helpers
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "—";
    let [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };
 
  

  // Dashboard state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [checkInsToday, setCheckInsToday] = useState(0);
  const [lockersInUse, setLockersInUse] = useState(0);
  const [newSignUpsTodayCount, setNewSignUpsTodayCount] = useState(0);
  const [newSignUps, setNewSignUps] = useState([]);
  const [renewalsTodayCount, setRenewalsTodayCount] = useState(0);

  // Add this with your other useState declarations
const [renewalsToday, setRenewalsToday] = useState([]);


  const [walkIns, setWalkIns] = useState([]);
  const [members, setMembers] = useState([]);
  const [monthlyClients, setMonthlyClients] = useState([]);
  const [visits, setVisits] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [schedule, setSchedule] = useState([]);

  const [staffId, setStaffId] = useState(null);
  const [staffBranch, setStaffBranch] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);


  // Instead of localStorage, we use a state bool for the logged‑in staff's clock status
  const [isClockedIn, setIsClockedIn] = useState(false);

  // Derived states for metrics
  const dayjsToday = dayjs(); // Define it properly
  const today = dayjsToday;
  const next7 = today.add(7, "day");
  
  
  const upcomingExpirations = members.filter((member) => {
    if (String(member.StartedBranchID) !== String(staffBranch)) {
      return false;
    }
  
    if (!member?.MembershipEndDate) return false;
    const endDate = dayjs(member.MembershipEndDate);
  
    return endDate.isAfter(today) && endDate.isBefore(next7);
  });
  const newSignUpsToday = newSignUps.filter((p) =>
    dayjs(p.PaymentDate).isSame(dayjs(currentTime), "day")
  );
  
    // Fetch logged-in staff info (Phase 1)
    const fetchStaffData = async () => {
      try {
        const res = await axios.get("/staff/get-logged-in-staff");
        const data = res.data;
        if (data && data.StaffID) {
          setStaffId(data.StaffID);
          setStaffBranch(data.BranchID);
        }
      } catch (err) {
        console.error("Failed to load staff info:", err);
        setError("Could not load staff info.");
      }
    };

  // Tabs: 0 => Visits, 1 => Walk-Ins, 2 => Expiring Soon
  const [activeTab, setActiveTab] = useState(0);

  // The user can toggle: "Member" or "Monthly Client"
  const [checkInType, setCheckInType] = useState("member");
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const [isClientDetailsOpen, setClientDetailsOpen] = useState(false);
  
  // Dialog states
  const [checkInMethod, setCheckInMethod] = useState("card");
  const [isCamOpen, setCamOpen] = useState(false);
  const [isBiometricOpen, setBiometricOpen] = useState(false);
  const [isDetailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [pendingCheckInMethod, setPendingCheckInMethod] = useState("card");

  // Visits
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isViewVisitOpen, setViewVisitOpen] = useState(false);
  const [isEditVisitOpen, setEditVisitOpen] = useState(false);

  
  // Walk-Ins
  const [selectedWalkIn, setSelectedWalkIn] = useState(null);
  const [isViewWalkInOpen, setViewWalkInOpen] = useState(false);
  const [isEditWalkInOpen, setEditWalkInOpen] = useState(false);
  const [isAddWalkInOpen, setAddWalkInOpen] = useState(false);
  const [newWalkIn, setNewWalkIn] = useState({
    FullName: "",
    VisitDate: "",
    Notes: "",
    PaymentMethod: "",
    PaymentAmount: "",
  });



  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // -- PHASE 1: ON MOUNT => fetch staff data so we know staffBranch
  useEffect(() => {
    fetchStaffData(); // sets staffId and staffBranch if found
  }, []);

  
  const fetchAllDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Metrics
      const metricsRes = await axios.get("/staff/metrics");
      setCheckInsToday(metricsRes.data.checkInsToday || 0);
      setLockersInUse(metricsRes.data.lockersInUse || 0);

      // 2) Visits (branch-based)
      const visitsRes = await axios.get("/operations/visits", {
        params: { branchID: staffBranch },
      });
      setVisits(visitsRes.data.visits || []);

      // 3) Walk-Ins
      const walkInsRes = await axios.get("/operations/walk-ins");
      setWalkIns(walkInsRes.data || []);

      // 4) Attendance (branch-based)
      const attendRes = await axios.get("/staff/attendance", {
        params: { branchID: staffBranch },
      });
      const fetchedAttendance = Array.isArray(attendRes.data)
        ? attendRes.data
        : attendRes.data.attendance || [];
      setAttendance(fetchedAttendance);

      // 5) Determine clock state for the logged-in staff
      const todayDate = new Date().toISOString().split("T")[0];
      const todaysAttendance = fetchedAttendance.filter(
        (rec) => rec.Date === todayDate && rec.StaffID === staffId
      );
      const clockedInRecord = todaysAttendance.find(
        (rec) => rec.TimeIn && !rec.TimeOut
      );
      setIsClockedIn(!!clockedInRecord);

      // 6) Schedules
      const scheduleRes = await axios.get("/staff/schedules");
      setSchedule(scheduleRes.data || []);

      // 7) Staff list
      const staffRes = await axios.get("/staff");
      setStaffList(staffRes.data || []);

      // 8) Members
      const membersRes = await axios.get("/membership/members");
      setMembers(membersRes.data.members || []);

      // 9) Payments (new sign‑ups & renewals)
      const paymentsRes = await axios.get("/payments");
      const allPayments = paymentsRes.data || [];

      const todayDateFormatted = dayjs().format("YYYY-MM-DD");
      const newSignUpsFiltered = allPayments.filter((p) => {
        const paymentFor = Array.isArray(p.PaymentFor)
          ? p.PaymentFor
          : [p.PaymentFor];
        const paymentDate = dayjs(p.PaymentDate).format("YYYY-MM-DD");
        return (
          String(p.BranchID) === String(staffBranch) &&
          paymentFor.includes("New Membership") &&
          paymentDate === todayDateFormatted
        );
      });
      setNewSignUpsTodayCount(newSignUpsFiltered.length);
      setNewSignUps(newSignUpsFiltered);

      const renewals = allPayments.filter((p) => {
        const paymentFor = Array.isArray(p.PaymentFor) ? p.PaymentFor : [p.PaymentFor];
        const paymentDate = dayjs(p.PaymentDate).format("YYYY-MM-DD");
        return (
          String(p.BranchID) === String(staffBranch) &&
          paymentFor.includes("Membership Renewal") &&
          paymentDate === todayDateFormatted
        );
      });
      setRenewalsTodayCount(renewals.length);
      setRenewalsToday(renewals);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load staff dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staffBranch) return; // skip if branch is null/undefined
    fetchAllDashboardData();
  }, [staffBranch, staffId]);
  
  

  // ------------- API Calls (Step 1) -------------


  // On mount, load additional data
  useEffect(() => {
    axios.get("/membership/members").then((res) => {
      setMembers(res.data.members || []);
    });
    axios.get("/monthly-clients").then((res) => {
      setMonthlyClients(res.data || []);
    });
  }, []);
  
  // ------------- CRUD / clock-in / check-in etc. -------------
  const handleTabChange = (e, val) => {
    setActiveTab(val);
  };

  const handleCheckInMethodChange = (e) => {
    const method = e.target.value;
    setCheckInMethod(method);
    
    if (method === 'biometric') {
      setFingerprintAuthDialogOpen(true);
    } else if (method === 'qrcode') {
      setQrCodeDialogOpen(true);
    }
    // Other methods will be handled when the check-in button is clicked
  };

  // Toggle between normal members vs monthly clients
  const handleToggleCheckInType = (evt) => {
    setCheckInType(evt.target.checked ? "monthlyClient" : "member");
    setSelectedMember(null);
    setSelectedClient(null);
  };

  // Show details for whichever type is selected
  const handleShowDetails = () => {
    if (checkInType === "member") {
      if (!selectedMember) {
        alert("Please select a member first.");
        return;
      }
    } else {
      if (!selectedClient) {
        alert("Please select a monthly client first.");
        return;
      }
    }
  
    // ✅ Open details dialog only, no MemberAuthDialog
    setClientDetailsOpen(true);
  };
  

  // Add a helper function to update metrics
const updateMetrics = async () => {
  try {
    const metricsRes = await axios.get("/staff/metrics");
    setCheckInsToday(metricsRes.data.checkInsToday || 0);
    // You can update other metrics here as needed
  } catch (error) {
    console.error("Failed to update metrics:", error);
  }
};



  // Modify the handleConfirmCheckIn function to handle QR code scanning
  const handleConfirmCheckIn = async () => {
    try {
      if (checkInType === "member") {
        if (!selectedMember) return;
  
        // Close the member details dialog to prevent duplication
        setClientDetailsOpen(false);
  
        await axios.post("/operations/visits", {
          MemberID: selectedMember.MemberID,
          BranchID: staffBranch,
          CheckInMethod: checkInMethod, // now it uses the chosen method
        });
        
  
        // Refresh visits list
        const visitsRes = await axios.get("/operations/visits", {
          params: { branchID: staffBranch },
        });
        setVisits(visitsRes.data.visits || []);
  
        // Refresh metrics immediately
        await updateMetrics();
  
        showSuccessMessage(`Checked in Member: ${selectedMember.FullName}`);
  
        // 🔹 Only open `MemberAuthDialog` for QR Code or Biometric Check-ins
        if (checkInMethod === "qrcode" || checkInMethod === "biometric") {
          setMemberAuthDialogOpen(true);
        }
  
        // Reset state
        setCheckInDialogOpen(false);
        setSelectedMember(null);
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      alert("Failed to check in. Please try again.");
    }
  };
  

  // Add the QR code scanner dialog after other dialogs
  const handleQrCodeSuccess = (member) => {
    setQrCodeDialogOpen(false); // Close scanner once scanned
    setCheckInDialogOpen(false); // Close previous dialog to prevent reopening
    setScannedMember(member);
    setAuthMethod("qrcode");
    setMemberAuthDialogOpen(true);
};

  

  const handleQrCodeError = (message) => {
    setSnackMessage(message || "QR code scanning error.");
    setSnackSeverity("error");
    setSnackOpen(true);
  };


  const handleScheduleClock = async (staffRow) => {
    // Instead of raw new Date().toISOString(), do:
    const todayStr = dayjs().format('YYYY-MM-DD');
  
    // Compare the schedule date to dayjs's formatted date:
    const stSchedule = schedule.find((sch) => {
      // If sch.ShiftDate is "2025-03-17T00:00:00.000Z" or "2025-03-17",
      // format it to "YYYY-MM-DD" and compare:
      const scheduleDate = dayjs(sch.ShiftDate).format('YYYY-MM-DD');
      return (
        sch.StaffID === staffRow.StaffID &&
        scheduleDate === todayStr
      );
    });
  
    // Now stSchedule will actually be found if today's schedule is present
    if (!stSchedule) {
      showSuccessMessage(`No schedule for ${staffRow.FullName} today.`);
      return;
    }
  
    // The rest of your clock logic remains the same
    const att = attendance.find(
      (a) => a.StaffID === staffRow.StaffID && a.Date === todayStr
    );
    const timeStr = new Date().toLocaleTimeString("it-IT").slice(0, 5);
  
    let clockData = {
      StaffID: staffRow.StaffID,
      BranchID: staffBranch,
      Date: todayStr,
    };
  
    if (!att || !att.TimeIn) {
      clockData.TimeIn = timeStr;
      clockData.TimeOut = null;
    } else if (!att.TimeOut) {
      clockData.TimeIn = null;
      clockData.TimeOut = timeStr;
    } else {
      showSuccessMessage(`${staffRow.FullName} has already completed attendance.`);
      return;
    }
  
    try {
      const response = await axios.post(
        "/staff/attendance/clock-in-out",
        clockData
      );
      const updatedRec = response.data.attendance;
      if (!updatedRec) {
        showSuccessMessage("Attendance updated but no record returned.");
        return;
      }
      setAttendance((prev) => {
        const others = prev.filter(
          (a) => !(a.StaffID === updatedRec.StaffID && a.Date === updatedRec.Date)
        );
        return [...others, updatedRec];
      });
      showSuccessMessage(
        updatedRec.TimeOut
          ? `${staffRow.FullName} clocked out at ${updatedRec.TimeOut}`
          : `${staffRow.FullName} clocked in at ${updatedRec.TimeIn}`
      );
    } catch (err) {
      console.error("Failed to clock in/out", err);
      showSuccessMessage("Error updating attendance. Check console for details.");
    }
  };

  // Clock In/Out for logged-in staff
  const refreshClockState = async () => {
    try {
      const attendRes = await axios.get("/staff/attendance", {
        params: { branchID: staffBranch },
      });
      const fetchedAttendance = Array.isArray(attendRes.data)
        ? attendRes.data
        : attendRes.data.attendance || [];
      setAttendance(fetchedAttendance);
      const todayDate = new Date().toISOString().split("T")[0];
      const clockedInRecord = fetchedAttendance.find(
        (rec) => rec.Date === todayDate && rec.StaffID === staffId && rec.TimeIn && !rec.TimeOut
      );
      const newState = !!clockedInRecord;
      setIsClockedIn(newState);
      return newState;
    } catch (error) {
      console.error("Error refreshing clock state:", error);
      return false;
    }
  };

  const handleClockInOut = async () => {
    if (!staffId) {
      console.warn("No staffId available, cannot clock in/out.");
      return;
    }
    const dateStr = new Date().toISOString().split("T")[0];
    const timeStr = currentTime.toLocaleTimeString("it-IT").slice(0, 5);
    const clockData = {
      StaffID: staffId,
      BranchID: staffBranch,
      Date: dateStr,
      TimeIn: isClockedIn ? null : timeStr,
      TimeOut: isClockedIn ? timeStr : null,
    };
    try {
      await axios.post("/staff/attendance/clock-in-out", clockData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newClockState = await refreshClockState();
      showSuccessMessage(
        newClockState ? "Clocked in successfully." : "Clocked out successfully."
      );
    } catch (err) {
      console.error("Failed to record attendance:", err);
      showSuccessMessage("Error clocking in/out. See console for details.");
    }
  };

  // ---------- VISITS & WALK-INS CRUD -------------
  const handleViewVisit = (visit) => {
    setSelectedVisit(visit);
    setViewVisitOpen(true);
  };
  const handleEditVisit = (visit) => {
    setSelectedVisit({ ...visit });
    setEditVisitOpen(true);
  };
  const handleEditVisitSubmit = async () => {
    if (!selectedVisit) return;
    try {
      await axios.put(`/operations/visits/${selectedVisit.VisitID}`, {
        MemberID: selectedVisit.MemberID,
        VisitDate: selectedVisit.VisitDate,
        VisitTime: selectedVisit.VisitTime,
        CheckInMethod: selectedVisit.CheckInMethod,
        Remarks: selectedVisit.Remarks,
      });
      setEditVisitOpen(false);
      const visitsRes = await axios.get("/operations/visits", {
        params: { branchID: staffBranch },
      });
      setVisits(visitsRes.data.visits || []);
      showSuccessMessage("Visit updated successfully.");
    } catch (err) {
      console.error("Failed to update visit:", err);
      alert("Error updating visit. Check console.");
    }
  };
  const handleDeleteVisit = async (visitID) => {
    if (!window.confirm("Delete this visit record?")) return;
    try {
      await axios.delete(`/operations/visits/${visitID}`);
      const visitsRes = await axios.get("/operations/visits", {
        params: { branchID: staffBranch },
      });
      setVisits(visitsRes.data.visits || []);
      showSuccessMessage("Visit deleted!");
    } catch (err) {
      console.error("Failed to delete visit:", err);
    }
  };

  const handleViewWalkIn = (wk) => {
    setSelectedWalkIn(wk);
    setViewWalkInOpen(true);
  };
  const handleEditWalkIn = (wk) => {
    setSelectedWalkIn({ ...wk });
    setEditWalkInOpen(true);
  };
  const handleEditWalkInSubmit = async () => {
    if (!selectedWalkIn) return;
    try {
      await axios.put(`/operations/walk-ins/${selectedWalkIn.WalkInID}`, {
        FullName: selectedWalkIn.FullName || "",
        VisitDate: selectedWalkIn.VisitDate,
        PaymentID: selectedWalkIn.PaymentID || null,
        PaymentMethod: selectedWalkIn.PaymentMethod || "",
        AmountPaid: selectedWalkIn.AmountPaid || 0,
        Notes: selectedWalkIn.Notes || "",
      });
      setEditWalkInOpen(false);
      const walkInsRes = await axios.get("/operations/walk-ins");
      setWalkIns(walkInsRes.data || []);
      showSuccessMessage("Walk-In updated!");
    } catch (err) {
      console.error("Failed to update walk-in:", err);
      alert("Error updating walk-in. Check console.");
    }
  };
  const handleDeleteWalkIn = async (walkInID) => {
    if (!window.confirm("Delete this walk-in record?")) return;
    try {
      await axios.delete(`/operations/walk-ins/${walkInID}`);
      const walkInsRes = await axios.get("/operations/walk-ins");
      setWalkIns(walkInsRes.data || []);
      showSuccessMessage("Walk-In deleted.");
    } catch (err) {
      console.error("Failed to delete walk-in:", err);
    }
  };
  const handleAddWalkInChange = (e) => {
    setNewWalkIn((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleAddWalkIn = async () => {
    try {
      await axios.post("/operations/walk-ins", {
        FullName: newWalkIn.FullName || null,
        VisitDate: newWalkIn.VisitDate,
        Notes: newWalkIn.Notes || null,
        PaymentMethod: newWalkIn.PaymentMethod || null,
        PaymentAmount: newWalkIn.PaymentAmount || 0,
      });
      showSuccessMessage("Walk-In created successfully.");
      setNewWalkIn({
        FullName: "",
        VisitDate: "",
        Notes: "",
        PaymentMethod: "",
        PaymentAmount: "",
      });
      setAddWalkInOpen(false);
      const walkInsRes = await axios.get("/operations/walk-ins");
      setWalkIns(walkInsRes.data || []);
    } catch (err) {
      console.error("Failed to create walk-in:", err);
      alert("Create error. Check console for details.");
    }
  };

  
  const todayString = dayjs(currentTime).format("YYYY-MM-DD");



  // ---------- TABLE COLUMNS ----------
  const actionButtonStyles = {
    minWidth: "40px",
    padding: "6px",
    transition: "transform 0.2s",
    "&:hover": { transform: "scale(1.05)" },
  };

  const visitColumns = [
    {
      field: "VisitID",
      headerName: "ID",
      width: 180,
    },
    {
      field: "MemberID",
      headerName: "Member",
      width: 250,
      renderCell: (params) => {
        const member = members.find((m) => m.MemberID === params.value);
        return member ? member.FullName : params.value;
      },
    },
    {
      field: "VisitDate",
      headerName: "Date",
      width: 180,
      renderCell: (params) => (params.value ? formatDate(params.value) : "—"),
    },
    {
      field: "VisitTime",
      headerName: "Time",
      width: 180,
      renderCell: (params) => (params.value ? formatTime(params.value) : "—"),
    },
    { field: "CheckInMethod", headerName: "Method", width: 100 },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      renderCell: (params) => {
        const row = params.row;
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="View">
              <Button
                variant="contained"
                size="small"
                onClick={() => handleViewVisit(row)}
                sx={{
                  ...actionButtonStyles,
                  backgroundColor: "#4caf50",
                  "&:hover": { backgroundColor: "#43a047" },
                }}
              >
                <VisibilityIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Edit">
              <Button
                variant="contained"
                size="small"
                onClick={() => handleEditVisit(row)}
                sx={{
                  ...actionButtonStyles,
                  backgroundColor: "#2196f3",
                  "&:hover": { backgroundColor: "#1976d2" },
                }}
              >
                <EditIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Delete">
              <Button
                variant="contained"
                size="small"
                onClick={() => handleDeleteVisit(row.VisitID)}
                sx={{
                  ...actionButtonStyles,
                  backgroundColor: "#f44336",
                  "&:hover": { backgroundColor: "#d32f2f" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </Button>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  const walkInColumns = [
    { field: "WalkInID", headerName: "ID", width: 80 },
    { field: "FullName", headerName: "Name", width: 130 },
    {
      field: "VisitDate",
      headerName: "Date",
      width: 150,
      renderCell: (params) => (params.value ? formatDate(params.value) : "—"),
    },
    { field: "Notes", headerName: "Notes", width: 150 },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      renderCell: (params) => {
        const row = params.row;
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="View">
              <Button
                variant="contained"
                size="small"
                onClick={() => handleViewWalkIn(row)}
                sx={{
                  ...actionButtonStyles,
                  backgroundColor: "#4caf50",
                  "&:hover": { backgroundColor: "#43a047" },
                }}
              >
                <VisibilityIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Edit">
              <Button
                variant="contained"
                size="small"
                onClick={() => handleEditWalkIn(row)}
                sx={{
                  ...actionButtonStyles,
                  backgroundColor: "#2196f3",
                  "&:hover": { backgroundColor: "#1976d2" },
                }}
              >
                <EditIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Delete">
              <Button
                variant="contained"
                size="small"
                onClick={() => handleDeleteWalkIn(row.WalkInID)}
                sx={{
                  ...actionButtonStyles,
                  backgroundColor: "#f44336",
                  "&:hover": { backgroundColor: "#d32f2f" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </Button>
            </Tooltip>
          </Box>
        );
      },
    },
  ];
  const newSignUpColumns = [
    { field: "PaymentID", headerName: "ID", width: 80 },
    {
      field: "MemberID",
      headerName: "Member",
      width: 250,
      renderCell: (params) => {
        const member = members.find((m) => m.MemberID === params.value);
        return member ? member.FullName : params.value;
      },
    },
    {
      field: "PaymentDate",
      headerName: "Date",
      width: 150,
      renderCell: (params) => (params.value ? formatDate(params.value) : "—"),
    },
    { field: "PaymentMethod", headerName: "Method", width: 150 },
    { field: "Amount", headerName: "Amount", width: 120 },
    {
      field: "PaymentFor",
      headerName: "Payment For",
      width: 200,
      renderCell: (params) => {
        const paymentFor = Array.isArray(params.value)
          ? params.value.join(", ")
          : params.value;
        return paymentFor;
      },
    },
  ];
  const renewalColumns = [
    { field: "PaymentID", headerName: "ID", width: 80 },
    {
      field: "MemberID",
      headerName: "Member",
      width: 250,
      renderCell: (params) => {
        const member = members.find((m) => m.MemberID === params.value);
        return member ? member.FullName : params.value;
      },
    },
    {
      field: "PaymentDate",
      headerName: "Date",
      width: 150,
      renderCell: (params) => (params.value ? formatDate(params.value) : "—"),
    },
    { field: "PaymentMethod", headerName: "Method", width: 150 },
    { field: "Amount", headerName: "Amount", width: 120 },
    {
      field: "PaymentFor",
      headerName: "Payment For",
      width: 200,
      renderCell: (params) => {
        const paymentFor = Array.isArray(params.value)
          ? params.value.join(", ")
          : params.value;
        return paymentFor;
      },
    },
  ];
  

  // Add new state for fingerprint authentication
  const [fingerprintAuthDialogOpen, setFingerprintAuthDialogOpen] = useState(false);
  const [authenticatedMember, setAuthenticatedMember] = useState(null);

  // Handler for when a fingerprint is successfully authenticated
  const handleFingerprintAuthenticated = (member) => {
    setAuthenticatedMember(member);
    setScannedMember(member);
    setAuthMethod('fingerprint');
    setMemberAuthDialogOpen(true);
  };

  // Handle confirmation of check-in from fingerprint auth dialog
  const handleFingerprintCheckIn = async (memberDetails) => {
    try {
      // Use the existing check-in endpoint
      await axios.post("/operations/visits", {
        MemberID: memberDetails.id,
        BranchID: staffBranch,
      });
      
      // Refresh the visits list
      const visitsRes = await axios.get("/operations/visits", {
        params: { branchID: staffBranch },
      });
      setVisits(visitsRes.data.visits || []);
      
      // Show success message
      showSuccessMessage(`Checked in Member: ${memberDetails.name}`);
      
      // Close the dialog
      setFingerprintAuthDialogOpen(false);
      setAuthenticatedMember(null);
    } catch (err) {
      console.error("Fingerprint check-in error:", err);
      setSnackSeverity("error");
      
      if (err.response && err.response.data && err.response.data.message) {
        setSnackMessage(err.response.data.message);
      } else {
        setSnackMessage("Check-in failed. See console for details.");
      }
      setSnackOpen(true);
    }
  };

  

  // Handler for when a QR code is successfully scanned and verified
  const handleQrCodeScanned = (memberDetails) => {
    showSuccessMessage(`Member checked in: ${memberDetails.name}`);
    
    // Refresh the visits list
    fetchAllDashboardData();
  };

  // Add these state variables for the member auth dialog
  const [memberAuthDialogOpen, setMemberAuthDialogOpen] = useState(false);
  const [scannedMember, setScannedMember] = useState(null);
  const [authMethod, setAuthMethod] = useState("qrcode");



  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
          <Box sx={{ mt: 1 }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => {
                startScanner();
              }}
            >
              Try Again
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  // Filter staff list for kiosk clock in: only staff in the same branch, exclude self
  const staffInMyBranch = staffList.filter(
    (st) =>
      st.StaffID !== staffId &&
      st.branches?.some((b) => String(b.BranchID) === String(staffBranch))
  );



// Then define your filtered arrays here:
const visitsToday = visits.filter((v) =>
  dayjs(v.VisitDate).isSame(dayjsToday, "day")
);
const walkInsToday = walkIns.filter((w) =>
  dayjs(w.VisitDate).isSame(dayjsToday, "day")
);
const walkInsTodayCount = walkInsToday.length;

  return (
    <Box sx={{ minHeight: "100vh", p: 2 }}>
      <Grid container spacing={2}>
        {/* Header */}
        <Grid item xs={12}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #B993D6 0%, #8CA6DB 100%)",
              color: "#fff",
              borderRadius: 2,
              p: 2,
              mb: 2,
              display: "flex",
              alignItems: "center",
              boxShadow: 3,
            }}
          >
            <IconButton sx={{ color: "#fff", mr: 1 }}>
              <DashboardIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                Staff Dashboard
              </Typography>
              <Typography variant="body2">
                Key performance overview and quick actions
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Metrics Cards Row */}
        <Grid container item xs={12} spacing={2}>
          <Grid item xs={12} md={3}>
            <Card
              onClick={() => setActiveTab(0)}
              sx={{
                p: 2,
                cursor: "pointer",
                borderRadius: 2,
                boxShadow: activeTab === 0 ? 6 : 2,
                transition: "box-shadow 0.3s",
                "&:hover": { boxShadow: 6 },
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? theme.palette.info.dark
                    : theme.palette.info.light,
                color: theme.palette.info.contrastText,
              }}
            >
              <CardContent
                sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <GroupIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle2">Check-ins Today</Typography>
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                  {checkInsToday}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card
              onClick={() => setActiveTab(1)}
              sx={{
                p: 2,
                cursor: "pointer",
                borderRadius: 2,
                boxShadow: activeTab === 1 ? 6 : 2,
                transition: "box-shadow 0.3s",
                "&:hover": { boxShadow: 6 },
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? theme.palette.success.dark
                    : theme.palette.success.light,
                color: theme.palette.success.contrastText,
              }}
            >
              <CardContent
                sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <DirectionsWalkIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle2">Walk-ins Today</Typography>
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                  {walkInsTodayCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card
            onClick={() => setActiveTab(2)}
              sx={{
                p: 2,
                cursor: "pointer",
                borderRadius: 2,
                boxShadow: 2,
                transition: "box-shadow 0.3s",
                "&:hover": { boxShadow: 6 },
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? theme.palette.secondary.dark
                    : theme.palette.secondary.light,
                color: theme.palette.secondary.contrastText,
              }}
            >
              <CardContent
              sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <BadgeIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="subtitle2">New Sign‑Ups Today</Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {newSignUpsToday.length}
              </Typography>
            </CardContent>

            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
          <Card
              onClick={() => setActiveTab(3)}
              sx={{
                p: 2,
                cursor: "pointer",
                borderRadius: 2,
                boxShadow: activeTab === 2 ? 6 : 2,
                transition: "box-shadow 0.3s",
                "&:hover": { boxShadow: 6 },
                backgroundColor: theme.palette.mode === "dark" ? theme.palette.warning.dark : theme.palette.warning.light,
                color: theme.palette.warning.contrastText,
              }}
            >
              <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <CachedIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="subtitle2">Renewals Today</Typography>
                <Typography variant="h4" sx={{ fontWeight: "bold" }}>{renewalsTodayCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* LEFT COLUMN: Check-In Member & Staff Schedule & Clock In/Out */}
        <Grid item xs={12} md={4}>
          {/* ===================== CHECK IN CARD ===================== */}
          <Card sx={{ mb: 2, borderRadius: 2, boxShadow: 2 }}>
            <CardHeader title="Check In" />
            <CardContent>
              {/* Manual Check-in Form */}
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Manual Check-in</Typography>
              {/* Switch: Member vs Monthly Client */}
              <FormControlLabel
                label="Monthly Client?"
                control={
                  <Switch
                    checked={checkInType === "monthlyClient"}
                    onChange={handleToggleCheckInType}
                    color="primary"
                  />
                }
                sx={{ mb: 2 }}
              />
              {checkInType === "member" ? (
                <>
                  <Autocomplete
                    options={members}
                    getOptionLabel={(option) =>
                      `${option.MemberID} - ${option.FullName}`
                    }
                    value={selectedMember}
                    onChange={(_, newVal) => setSelectedMember(newVal)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Member"
                        variant="outlined"
                        size="small"
                      />
                    )}
                    sx={{ mb: 2 }}
                  />
                </>
              ) : (
                <>
                  <Autocomplete
                    options={monthlyClients}
                    getOptionLabel={(option) =>
                      `${option.MonthlyClientID} - ${option.FullName}`
                    }
                    value={selectedClient}
                    onChange={(_, newVal) => setSelectedClient(newVal)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Monthly Client"
                        variant="outlined"
                        size="small"
                      />
                    )}
                    sx={{ mb: 2 }}
                  />
                </>
              )}
              <Button
                variant="contained"
                onClick={handleShowDetails}
                fullWidth
                disabled={
                  (checkInType === "member" && !selectedMember) ||
                  (checkInType === "monthlyClient" && !selectedClient)
                }
                sx={{ mb: 2 }}
              >
                Show Details / Verify
              </Button>
              <Divider sx={{ my: 2 }} />

              {/* Only the "WebcamDialog" approach for QR Code scanning */}
           {/* Always-On QR Code Scanner */}
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                QR Code Check-in
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                This scanner has enhanced exposure control for better scanning in bright light conditions. Use the exposure slider if QR codes from phone screens are hard to scan.
              </Alert>
              <QrCodeScanner
                branchId={staffBranch}
                alwaysOn={true}
                onSuccess={handleQrCodeSuccess}
                onError={handleQrCodeError}
              />

              </CardContent>
              </Card>

          {/* ===================== DIALOG FOR DETAILS ===================== */}
          <Dialog
            open={isClientDetailsOpen}
            onClose={() => setClientDetailsOpen(false)}
            maxWidth="md"
            fullWidth
            sx={{ "& .MuiDialog-paper": { borderRadius: 2, boxShadow: 3 } }}
          >
            <DialogTitle sx={{ pb: 0 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {checkInType === "member" ? "Member Details" : "Monthly Client Details"}
                </Typography>
                <IconButton
                  onClick={() => setClientDetailsOpen(false)}
                  sx={{ "&:hover": { color: theme.palette.error.main } }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 1 }}>
              {checkInType === "member" && selectedMember && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: theme.palette.divider,
                      mb: 2,
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#1e1e1e" : "#fafafa",
                    }}
                  >
                    {selectedMember.PhotoPath ? (
                      <Avatar
                        src={`/storage/${selectedMember.PhotoPath}`}
                        alt={selectedMember.FullName}
                        sx={{ width: 80, height: 80, fontSize: "1.5rem" }}
                      />
                    ) : (
                      <Avatar sx={{ width: 80, height: 80, fontSize: "1.5rem" }}>
                        {selectedMember.FullName?.[0] || "?"}
                      </Avatar>
                    )}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: "bold", mb: 0.3 }}>
                        {selectedMember.FullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedMember.Email || "No Email"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedMember.Phone || "No Phone"}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Membership Info
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Plan:
                      </Typography>
                      <Box mt={0.3}>
                        {selectedMember.plan ? (
                          <Chip
                            label={selectedMember.plan.PlanName}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        ) : (
                          <Chip label="No Plan" variant="outlined" size="small" />
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Status:
                      </Typography>
                      <Box mt={0.3}>
                      {selectedMember.status ? (
                        <Chip
                          label={selectedMember.status.StatusName}
                          {...getStatusChipProps(selectedMember.status.StatusName)}
                          size="small"
                        />
                      ) : (
                        <Chip label="N/A" variant="contained" size="small" />
                      )}
                    </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Start Date:
                      </Typography>
                      <Typography variant="body2">
                        {selectedMember.MembershipStartDate
                          ? formatDate(selectedMember.MembershipStartDate)
                          : "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        End Date:
                      </Typography>
                      <Typography variant="body2">
                        {selectedMember.MembershipEndDate
                          ? formatDate(selectedMember.MembershipEndDate)
                          : "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Divider sx={{ mt: 3, mb: 2 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Check-In Method
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Method</InputLabel>
                    <Select
                      label="Method"
                      value={checkInMethod}
                      onChange={(e) => setCheckInMethod(e.target.value)}
                    >
                      <MenuItem value="manual">Manual</MenuItem>
                      <MenuItem value="card">Membership Card</MenuItem>
                      <MenuItem value="qrcode">QR Code</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
              {checkInType === "monthlyClient" && selectedClient && (
                <Box>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: theme.palette.divider,
                      mb: 2,
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#1e1e1e" : "#fafafa",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: "bold", mb: 0.5 }}>
                      {selectedClient.FullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedClient.Email || "No Email"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedClient.Phone || "No Phone"}
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Monthly Client Info
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Start Date:
                      </Typography>
                      <Typography variant="body2">
                        {selectedClient.StartDate
                          ? formatDate(selectedClient.StartDate)
                          : "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        End Date:
                      </Typography>
                      <Typography variant="body2">
                        {selectedClient.EndDate
                          ? formatDate(selectedClient.EndDate)
                          : "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Active?
                      </Typography>
                      <Box mt={0.3}>
                        {selectedClient.IsActive ? (
                          <Chip label="Yes" color="success" variant="outlined" size="small" />
                        ) : (
                          <Chip label="No" color="error" variant="outlined" size="small" />
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                  <Divider sx={{ mt: 3, mb: 2 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Check-In Method
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Method</InputLabel>
                    <Select
                      label="Method"
                      value={checkInMethod}
                      onChange={(e) => setCheckInMethod(e.target.value)}
                    >
                      <MenuItem value="manual">Manual</MenuItem>
                      <MenuItem value="card">Membership Card</MenuItem>
                      <MenuItem value="biometric">Biometric</MenuItem>
                      <MenuItem value="qrcode">QR Code</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ py: 2, px: 3 }}>
              
              <Button variant="contained" onClick={handleConfirmCheckIn} fullWidth>
                Confirm Check In
              </Button>
            </DialogActions>
          </Dialog>

          {/* Staff Schedule & Clock In/Out Card */}
          <Card
            sx={{
              mb: 2,
              borderRadius: 4,
              boxShadow: 4,
              p: 3,
              backgroundColor: "background.paper",
            }}
          >
            <CardHeader
              title="Staff Schedule & Clock In/Out"
              sx={{
                textAlign: "center",
                fontWeight: "bold",
                color: "primary.dark",
              }}
            />
            <CardContent>
              <Box
                sx={{
                  textAlign: "center",
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 500,
                  }}
                >
                  {dayjs(currentTime).format("dddd, MMMM D, YYYY")}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: "bold",
                    color: "#fffff",
                    letterSpacing: 1,
                    mt: 1,
                  }}
                >
                  {currentTime.toLocaleTimeString()}
                </Typography>
              </Box>
              {staffInMyBranch.length === 0 ? (
                <Typography align="center">No staff found in your branch.</Typography>
              ) : (
                <List>
                  {staffInMyBranch.map((st) => {
                    const stSchedule = schedule.find(
                      (sch) => sch.StaffID === st.StaffID && sch.ShiftDate === todayString
                    );
                    const att = attendance.find(
                      (a) => a.StaffID === st.StaffID && a.Date === todayString
                    );
                    const clockedIn = att && att.TimeIn && !att.TimeOut;
                    const clockedOut = att && att.TimeIn && att.TimeOut;
                    const disabled = !stSchedule;
                    let btnLabel = "Clock In";
                    let btnColor = "success";
                    if (clockedIn) {
                      btnLabel = "Clock Out";
                      btnColor = "error";
                    } else if (clockedOut) {
                      btnLabel = "Completed";
                      btnColor = "info";
                    } else if (!stSchedule) {
                      btnLabel = "No Schedule";
                      btnColor = "inherit";
                    }
                    return (
                      <ListItem key={st.StaffID} divider sx={{ py: 1.5 }}>
                        <ListItemText
                          primary={st.FullName}
                          secondary={
                            stSchedule ? (
                              <>
                             <Typography variant="body2">
                                  Shift: {formatTime(stSchedule.ShiftStart)} - {formatTime(stSchedule.ShiftEnd)}
                                </Typography>

                                {att ? (
                                  att.TimeIn && !att.TimeOut ? (
                                    <Typography variant="body2" color="success.main">
                                      Clocked In at {formatTime(att.TimeIn)}
                                    </Typography>
                                  ) : att.TimeIn && att.TimeOut ? (
                                    <Typography variant="body2" color="text.secondary">
                                      In: {formatTime(att.TimeIn)}, Out: {formatTime(att.TimeOut)}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="warning.main">
                                      Scheduled, not clocked in yet.
                                    </Typography>
                                  )
                                ) : (
                                  <Typography variant="body2" color="warning.main">
                                    Scheduled, but no attendance record yet.
                                  </Typography>
                                )}
                              </>
                            ) : (
                              "No schedule for today."
                            )
                          }
                          sx={{ "& .MuiTypography-root": { fontSize: "0.9rem" } }}
                        />
                        <Button
                          variant="contained"
                          color={btnColor}
                          onClick={() => handleScheduleClock(st)}
                          disabled={disabled || clockedOut}
                          sx={{ minWidth: 120, fontSize: "0.8rem", fontWeight: "bold" }}
                        >
                          {btnLabel}
                        </Button>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

         {/* RIGHT COLUMN: Tabbed Data (Visits, Walk-ins, Expiring Soon) */}
         <Grid item xs={12} md={8}>
         <Card
            sx={{
              borderRadius: 2,
              boxShadow: 2,
              display: "flex",            // 1) Make the Card a flex container
              flexDirection: "column",    //    so children can fill vertical space
              height: "100%",             //    it must have a defined height (or parent must define it)
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
            <Tab icon={<GroupIcon />} label="Visits" />
            <Tab icon={<DirectionsWalkIcon />} label="Walk-Ins" />
            <Tab icon={<BadgeIcon />} label="New Sign‑Ups Today" />
            <Tab icon={<CachedIcon />} label="Renewals Today" /> {/* Updated label */}
            <Tab icon={<LockIcon />} label="Locker Management" />
          </Tabs>
            </Box>

            {/* This Box will be the flexible area that holds the tables */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* We'll conditionally render each tab's content here.
                  Instead of giving each <Paper> a fixed height, we make it fill parent. */}
              {activeTab === 0 && (
                <Paper
                  sx={{
                    flex: 1,                   // 2) Let the Paper fill available space
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Then we let the DataGrid stretch inside */}
                  <Box sx={{ flex: 1 }}>
                    <DataGrid
                      rows={[...visitsToday].sort((a, b) => {
                        // Sort by date and time, newest first
                        const dateA = new Date(a.VisitDate + ' ' + (a.VisitTime || '00:00'));
                        const dateB = new Date(b.VisitDate + ' ' + (b.VisitTime || '00:00'));
                        return dateB - dateA;
                      })}
                      columns={visitColumns}
                      getRowId={(row) => row.VisitID}
                      pageSize={30}
                      rowsPerPageOptions={[30]}
                      sx={{
                        flex: 1,               // 3) Make the DataGrid grow within the parent Box
                        border: 0,
                        "& .MuiDataGrid-columnHeaders": {
                          backgroundColor: "#f5f5f5",
                          fontWeight: "bold",
                          fontSize: "1rem",
                        },
                        "& .MuiDataGrid-cell": {
                          borderBottom: "1px solid #e0e0e0",
                        },
                      }}
                    />
                  </Box>
                </Paper>
              )}

              {activeTab === 1 && (
                <Paper
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <DataGrid
                      rows={[...walkInsToday].sort((a, b) => {
                        // Sort by date, newest first
                        return new Date(b.VisitDate) - new Date(a.VisitDate);
                      })}
                      columns={walkInColumns}
                      getRowId={(row) => row.WalkInID}
                      pageSize={30}
                      rowsPerPageOptions={[30]}
                      sx={{
                        flex: 1,
                        border: 0,
                        "& .MuiDataGrid-columnHeaders": {
                          backgroundColor: "#f5f5f5",
                          fontWeight: "bold",
                          fontSize: "1rem",
                        },
                        "& .MuiDataGrid-cell": {
                          borderBottom: "1px solid #e0e0e0",
                        },
                      }}
                    />
                  </Box>
                </Paper>
              )}

              {activeTab === 2 && (
                <Paper
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                  <DataGrid
                  rows={[...newSignUpsToday].sort((a, b) => {
                    // Sort by payment date, newest first
                    return new Date(b.PaymentDate) - new Date(a.PaymentDate);
                  })}
                  columns={newSignUpColumns}
                  getRowId={(row) => row.PaymentID}
                  pageSize={30}
                  rowsPerPageOptions={[30]}
                  sx={{
                    flex: 1,
                    border: 0,
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#f5f5f5",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    },
                    "& .MuiDataGrid-cell": {
                      borderBottom: "1px solid #e0e0e0",
                    },
                  }}
                />

                  </Box>
                </Paper>
              )}

              {activeTab === 3 && (
                <Paper
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <DataGrid
                      rows={[...renewalsToday].sort((a, b) => {
                        // Sort by payment date, newest first
                        return new Date(b.PaymentDate) - new Date(a.PaymentDate);
                      })}
                      columns={renewalColumns}
                      getRowId={(row) => row.PaymentID}
                      pageSize={30}
                      rowsPerPageOptions={[30]}
                      sx={{
                        flex: 1,
                        border: 0,
                        "& .MuiDataGrid-columnHeaders": {
                          backgroundColor: "#f5f5f5",
                          fontWeight: "bold",
                          fontSize: "1rem",
                        },
                        "& .MuiDataGrid-cell": {
                          borderBottom: "1px solid #e0e0e0",
                        },
                      }}
                    />
                  </Box>
                </Paper>
              )}


              {activeTab === 4 && (
                <Paper
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <LockerManagement />
                </Paper>
              )}
            </Box>
          </Card>

        </Grid>
      </Grid>
      {/* Dialogs for Camera, Biometric, Visits, Walk-ins, etc. */}
      <Dialog
        open={isCamOpen}
        onClose={() => setCamOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Card Scanning via Webcam</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Placeholder for webcam scanning. A real implementation would parse a barcode or QR code.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCamOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setCamOpen(false)}>
            Simulate Card Scan
          </Button>
        </DialogActions>
      </Dialog>
      {/* Biometric Dialog with Fingerprint Scanner */}
      <Dialog 
        open={isBiometricOpen} 
        onClose={() => setBiometricOpen(false)} 
        fullWidth 
        maxWidth="sm"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Fingerprint Authentication</Typography>
            <IconButton onClick={() => setBiometricOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Please place your finger on the scanner to authenticate
            </Typography>
            <FingerprintScanner 
              onAuthenticated={handleFingerprintAuthenticated} 
              branchId={staffBranch} 
              disabled={!staffBranch}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBiometricOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* View Visit Dialog */}
      <Dialog
        open={isViewVisitOpen}
        onClose={() => setViewVisitOpen(false)}
        fullWidth
        maxWidth="lg"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 2,
            boxShadow: 2,
            p: 3,
          },
        }}
      >
        <DialogTitle sx={{ p: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Visit Details
            </Typography>
            <IconButton
              onClick={() => setViewVisitOpen(false)}
              sx={{ "&:hover": { color: theme.palette.error.main } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedVisit &&
            (() => {
              const mem = members.find((m) => m.MemberID === selectedVisit.MemberID);
              return (
                <Box>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: 1,
                        overflow: "hidden",
                        bgcolor: "#f9f9f9",
                        border: "1px solid #ddd",
                      }}
                    >
                      {mem && mem.PhotoPath ? (
                        <Box
                          component="img"
                          src={`/storage/${mem.PhotoPath}`}
                          alt="Member"
                          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{ color: "gray", textAlign: "center", lineHeight: "100px" }}
                        >
                          No photo
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {mem ? mem.FullName : "—"}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontSize: "1.1rem" }}>
                        {mem ? mem.Email : "—"}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontSize: "1.1rem" }}>
                        {mem ? mem.Phone : "—"}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box mb={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                      Membership Info
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      <TextField
                        variant="filled"
                        size="small"
                        label="Plan"
                        InputProps={{
                          readOnly: true,
                          startAdornment: (
                            <InputAdornment position="start">
                              <GroupsIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                        value={mem?.plan ? mem.plan.PlanName : "N/A"}
                      />
                      <TextField
                        variant="filled"
                        size="small"
                        label="Status"
                        InputProps={{
                          readOnly: true,
                          startAdornment: (
                            <InputAdornment position="start">
                              <WarningIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                        value={mem?.status ? mem.status.StatusName : "N/A"}
                      />
                      <TextField
                        variant="filled"
                        size="small"
                        label="Start Date"
                        InputProps={{ readOnly: true }}
                        value={mem?.MembershipStartDate ? formatDate(mem.MembershipStartDate) : "—"}
                      />
                      <TextField
                        variant="filled"
                        size="small"
                        label="End Date"
                        InputProps={{ readOnly: true }}
                        value={mem?.MembershipEndDate ? formatDate(mem.MembershipEndDate) : "—"}
                      />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box mb={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                      Visit Info
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      <TextField
                        variant="filled"
                        size="small"
                        label="Visit Date"
                        InputProps={{ readOnly: true }}
                        value={selectedVisit.VisitDate ? formatDate(selectedVisit.VisitDate) : "—"}
                      />
                      <TextField
                        variant="filled"
                        size="small"
                        label="Visit Time"
                        InputProps={{ readOnly: true }}
                        value={selectedVisit.VisitTime ? formatTime(selectedVisit.VisitTime) : "—"}
                      />
                      <TextField
                        variant="filled"
                        size="small"
                        label="Method"
                        InputProps={{ readOnly: true }}
                        value={selectedVisit.CheckInMethod || "—"}
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={isEditVisitOpen} onClose={() => setEditVisitOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Visit</DialogTitle>
        <DialogContent dividers>
          {selectedVisit && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="MemberID"
                value={selectedVisit.MemberID}
                onChange={(e) =>
                  setSelectedVisit((prev) => ({ ...prev, MemberID: e.target.value }))
                }
              />
              <TextField
                label="VisitDate"
                type="date"
                value={selectedVisit.VisitDate}
                onChange={(e) =>
                  setSelectedVisit((prev) => ({ ...prev, VisitDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="VisitTime"
                value={selectedVisit.VisitTime}
                onChange={(e) =>
                  setSelectedVisit((prev) => ({ ...prev, VisitTime: e.target.value }))
                }
              />
              <TextField
                label="CheckInMethod"
                value={selectedVisit.CheckInMethod || ""}
                onChange={(e) =>
                  setSelectedVisit((prev) => ({ ...prev, CheckInMethod: e.target.value }))
                }
              />
              <TextField
                label="Remarks"
                value={selectedVisit.Remarks || ""}
                onChange={(e) =>
                  setSelectedVisit((prev) => ({ ...prev, Remarks: e.target.value }))
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditVisitOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditVisitSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Walk-In Dialog */}
      <Dialog open={isViewWalkInOpen} onClose={() => setViewWalkInOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Walk-In Details</DialogTitle>
        <DialogContent dividers>
          {selectedWalkIn && (
            <Box>
              <Typography>
                <strong>ID:</strong> {selectedWalkIn.WalkInID}
              </Typography>
              <Typography>
                <strong>Name:</strong> {selectedWalkIn.FullName}
              </Typography>
              <Typography>
                <strong>VisitDate:</strong> {selectedWalkIn.VisitDate}
              </Typography>
              <Typography>
                <strong>Notes:</strong> {selectedWalkIn.Notes}
              </Typography>
              <Typography>
                <strong>PaymentMethod:</strong> {selectedWalkIn.PaymentMethod}
              </Typography>
              <Typography>
                <strong>AmountPaid:</strong> {selectedWalkIn.AmountPaid}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setViewWalkInOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Walk-In Dialog */}
      <Dialog open={isEditWalkInOpen} onClose={() => setEditWalkInOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Walk-In</DialogTitle>
        <DialogContent dividers>
          {selectedWalkIn && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Name"
                value={selectedWalkIn.FullName || ""}
                onChange={(e) =>
                  setSelectedWalkIn((prev) => ({ ...prev, FullName: e.target.value }))
                }
              />
              <TextField
                label="VisitDate"
                type="date"
                value={selectedWalkIn.VisitDate || ""}
                onChange={(e) =>
                  setSelectedWalkIn((prev) => ({ ...prev, VisitDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Payment Method"
                value={selectedWalkIn.PaymentMethod || ""}
                onChange={(e) =>
                  setSelectedWalkIn((prev) => ({ ...prev, PaymentMethod: e.target.value }))
                }
              />
              <TextField
                label="AmountPaid"
                type="number"
                value={selectedWalkIn.AmountPaid || ""}
                onChange={(e) =>
                  setSelectedWalkIn((prev) => ({ ...prev, AmountPaid: e.target.value }))
                }
              />
              <TextField
                label="Notes"
                multiline
                rows={2}
                value={selectedWalkIn.Notes || ""}
                onChange={(e) =>
                  setSelectedWalkIn((prev) => ({ ...prev, Notes: e.target.value }))
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditWalkInOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditWalkInSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Walk-In Dialog */}
      <Dialog open={isAddWalkInOpen} onClose={() => setAddWalkInOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add New Walk-In</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Full Name"
            name="FullName"
            fullWidth
            margin="dense"
            value={newWalkIn.FullName}
            onChange={handleAddWalkInChange}
          />
          <TextField
            label="Visit Date"
            name="VisitDate"
            type="date"
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
            value={newWalkIn.VisitDate}
            onChange={handleAddWalkInChange}
          />
          <TextField
            label="Payment Method"
            name="PaymentMethod"
            fullWidth
            margin="dense"
            value={newWalkIn.PaymentMethod}
            onChange={handleAddWalkInChange}
          />
          <TextField
            label="Payment Amount"
            name="PaymentAmount"
            type="number"
            fullWidth
            margin="dense"
            value={newWalkIn.PaymentAmount}
            onChange={handleAddWalkInChange}
          />
          <TextField
            label="Notes"
            name="Notes"
            fullWidth
            margin="dense"
            multiline
            rows={3}
            value={newWalkIn.Notes}
            onChange={handleAddWalkInChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddWalkInOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddWalkIn}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* MemberAuthDialog */}
      <MemberAuthDialog
        open={memberAuthDialogOpen}
        onClose={() => setMemberAuthDialogOpen(false)}
        memberId={scannedMember?.id}
        memberName={scannedMember?.FullName || scannedMember?.name}
        authMethod={authMethod}
        staffBranch={staffBranch}
        onConfirmCheckIn={async (memberDetails) => {
          // <-- The real POST to /operations/visits is done here only
          await axios.post("/operations/visits", {
            MemberID: memberDetails.MemberID, // or memberDetails.id
            BranchID: staffBranch,
            CheckInMethod: authMethod,
          });
          showSuccessMessage(`Checked in Member: ${memberDetails.FullName}`);
          
          // Refresh visits
          const visitsRes = await axios.get("/operations/visits", {
            params: { branchID: staffBranch },
          });
          setVisits(visitsRes.data.visits || []);

          // Optionally refresh metrics
          await updateMetrics();
          
          // Done. The dialog will call onClose automatically.
        }}
      />



      {/* Snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert 
          onClose={() => setSnackOpen(false)} 
          severity={snackSeverity} 
          sx={{ width: "100%" }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
