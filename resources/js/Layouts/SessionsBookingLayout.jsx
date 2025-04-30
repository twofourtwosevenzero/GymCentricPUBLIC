import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Button,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PeopleIcon from "@mui/icons-material/People";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SearchIcon from "@mui/icons-material/Search";

export default function SessionsBookingLayout({ onClose }) {
  const theme = useTheme();

  // State for attendance and waitlist
  const [attendance, setAttendance] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabValue, setTabValue] = useState(0);

  // State for Waitlist Form
  const [sessionToWaitlist, setSessionToWaitlist] = useState(null);
  const [waitlistMemberID, setWaitlistMemberID] = useState("");
  const [waitlistDate, setWaitlistDate] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState("Pending");
  const [isWaitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  // ✅ Fetch attendance and waitlist records
  const fetchAllData = async () => {
    try {
      setLoading(true);

      console.log("Fetching Attendance and Waitlist Data...");

      const attendanceRes = await axios.get("/api/attendance");
      const waitlistRes = await axios.get("/api/session_waitlists"); // ✅ Fetch waitlist

      console.log("✅ Attendance Data:", attendanceRes.data);
      console.log("✅ Waitlist Data:", waitlistRes.data);

      if (!Array.isArray(attendanceRes.data) || !Array.isArray(waitlistRes.data)) {
        throw new Error("API response is not an array!");
      }

      setAttendance(attendanceRes.data || []);
      setWaitlist(waitlistRes.data || []);
    } catch (err) {
      console.error("❌ Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Waitlist Submission
  const handleWaitlistConfirm = async () => {
    if (!sessionToWaitlist || !waitlistMemberID) {
      alert("Please select a session and a member.");
      return;
    }

    try {
      console.log("Adding to Waitlist:", {
        SessionID: sessionToWaitlist.SessionID,
        MemberID: waitlistMemberID,
        WaitlistDate: waitlistDate,
        Status: waitlistStatus,
      });

      await axios.post("/api/session_waitlists", {
        SessionID: sessionToWaitlist.SessionID,
        MemberID: waitlistMemberID,
        WaitlistDate: waitlistDate,
        Status: waitlistStatus,
      });

      console.log("✅ Waitlist added successfully!");
      setWaitlistOpen(false);
      fetchAllData(); // ✅ Refresh waitlist data
    } catch (err) {
      console.error("❌ Failed to add to waitlist:", err);
    }
  };

  // ✅ Filter attendance & waitlist based on search term
  const filteredAttendance = attendance.filter((item) =>
    item.memberName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWaitlist = waitlist.filter(
    (item) =>
      item.MemberID.toString().includes(searchTerm.toLowerCase()) ||
      item.SessionID.toString().includes(searchTerm.toLowerCase())
  );

  // ✅ Attendance Table Columns
  const attendanceColumns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "memberName", headerName: "Member Name", width: 200 },
    { field: "sessionName", headerName: "Session", width: 200 },
    { field: "date", headerName: "Date", width: 150 },
    { field: "status", headerName: "Status", width: 150 },
  ];

  // ✅ Waitlist Table Columns
  const waitlistColumns = [
    { field: "WaitlistID", headerName: "Waitlist ID", width: 100 },
    { field: "SessionID", headerName: "Session ID", width: 100 },
    { field: "MemberID", headerName: "Member ID", width: 150 },
    { field: "WaitlistDate", headerName: "Waitlist Date", width: 180 },
    { field: "Status", headerName: "Status", width: 150 },
    { field: "created_at", headerName: "Created At", width: 200 },
  ];

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h5">Manage Session Attendance and Waitlist</Typography>
        <IconButton onClick={onClose} sx={{ "&:hover": { color: "red" } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          {/* ✅ Search Field Positioned Top Left */}
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search "
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 350 }}
          />

          {/* ✅ Tabs Positioned Top Right */}
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab icon={<PeopleIcon />} label="Attendance" />
            <Tab icon={<HourglassEmptyIcon />} label="Waitlist" />
          </Tabs>
        </Box>

        {/* ✅ Attendance Table */}
        {tabValue === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Attendance</Typography>
            <Paper sx={{ height: 350, width: "100%" }}>
              <DataGrid
                rows={filteredAttendance}
                columns={attendanceColumns}
                getRowId={(row) => row.id}
                pageSize={5}
                rowsPerPageOptions={[5, 10]}
                loading={loading}
              />
            </Paper>
          </Box>
        )}

        {/* ✅ Waitlist Table */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Waitlist</Typography>
            <Paper sx={{ height: 350, width: "100%" }}>
              <DataGrid
                rows={filteredWaitlist}
                columns={waitlistColumns}
                getRowId={(row) => row.WaitlistID}
                pageSize={5}
                rowsPerPageOptions={[5, 10]}
                loading={loading}
              />
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
