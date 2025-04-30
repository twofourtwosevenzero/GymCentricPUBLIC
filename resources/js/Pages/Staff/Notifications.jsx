import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  Checkbox,
  FormControlLabel,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Stack,
  Tabs,
  Tab,
  InputAdornment,
  Snackbar,
  Chip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

// ===== MUI Icons =====
import CampaignIcon from "@mui/icons-material/Campaign"; // Announcements
import EmailIcon from "@mui/icons-material/Email";       // Mailjet
import ForumIcon from "@mui/icons-material/Forum";       // Semaphore
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SendIcon from "@mui/icons-material/Send";

// Configure dayjs to use timezone plugin
dayjs.extend(utc);
dayjs.extend(timezone);

// ===== Helper Functions =====

// 1. Define a mapping from status ID to color and label:
const statusColorMap = {
  1: "green",    // ACTIVE
  2: "orange",   // FROZEN
  3: "blue",     // ON-HOLD
  4: "gray",     // TERMINATED
  5: "red",      // EXPIRED
  6: "purple",   // PENDING
  7: "dimgray",  // INACTIVE
};

const statusLabelMap = {
  1: "ACTIVE",
  2: "FROZEN",
  3: "ON-HOLD",
  4: "TERMINATED",
  5: "EXPIRED",
  6: "PENDING",
  7: "INACTIVE",
};

// ---------- DataGrid columns for Mailjet and Semaphore ----------
const mailjetColumns = [
  { field: "MemberID", headerName: "ID", width: 70 },
  { field: "FullName", headerName: "Name", width: 180 },
  { field: "Email", headerName: "Email", width: 200 },
  {
    field: "MemberStatusID",
    headerName: "Status",
    width: 150,
    renderCell: (params) => {
      const statusId = params.value;
      const label = statusLabelMap[statusId] || `Status ${statusId}`;
      const bgColor = statusColorMap[statusId] || "black";
  
      return (
        <Chip
          label={label}
          style={{ backgroundColor: bgColor, color: "white" }}
        />
      );
    },
  },
];

const semaphoreColumns = [
  { field: "MemberID", headerName: "ID", width: 70 },
  { field: "FullName", headerName: "Name", width: 180 },
  { field: "Phone", headerName: "Phone", width: 180 },
  {
    field: "MemberStatusID",
    headerName: "Status",
    width: 120,
    renderCell: (params) => {
      const statusId = params.value;
      const label = statusLabelMap[statusId] || `Status ${statusId}`;
      const bgColor = statusColorMap[statusId] || "black";
  
      return (
        <Chip
          label={label}
          style={{ backgroundColor: bgColor, color: "white" }}
        />
      );
    },
  },
];

// (Optional) For staff selection
const staffColumns = [
  { field: "StaffID", headerName: "ID", width: 70 },
  { field: "FullName", headerName: "Name", width: 180 },
  { field: "Email", headerName: "Email", width: 220 },
  { field: "Role", headerName: "Role", width: 150 },
];

export default function Notifications() {
  // Tabs
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [newTopic, setNewTopic] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Staff Notification
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [staffSubject, setStaffSubject] = useState("");
  const [staffMessage, setStaffMessage] = useState("");

  // Mailjet Templated Email
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMailjetIDs, setSelectedMailjetIDs] = useState([]);
  const [templateId, setTemplateId] = useState("");
  // Keep both filters
  const [mailjetEndDate, setMailjetEndDate] = useState("");
  const [mailjetFilterStatus, setMailjetFilterStatus] = useState("All");
  const [mailjetShowExpiring, setMailjetShowExpiring] = useState(false);
  // State for Mailjet activity logs
  const [mailjetActivityLogs, setMailjetActivityLogs] = useState([]);
  // Search term for Email Activity Logs
  const [logSearchTerm, setLogSearchTerm] = useState("");

  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  // Semaphore
  const [semaphoreMembers, setSemaphoreMembers] = useState([]);
  const [selectedSemaphoreIDs, setSelectedSemaphoreIDs] = useState([]);
  const [semaphoreNumbers, setSemaphoreNumbers] = useState("");
  const [semaphoreMessage, setSemaphoreMessage] = useState("");
  const [semaphoreSenderName, setSemaphoreSenderName] = useState("");
  // Keep both filters
  const [semaphoreEndDate, setSemaphoreEndDate] = useState("");
  const [semaphoreFilterStatus, setSemaphoreFilterStatus] = useState("All");
  const [semaphoreSearchTerm, setSemaphoreSearchTerm] = useState("");
  const [semaphoreActivityLogs, setSemaphoreActivityLogs] = useState([]);
  const [semaphoreLogSearchTerm, setSemaphoreLogSearchTerm] = useState("");

  // Staff Personal Notification
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedStaffIDs, setSelectedStaffIDs] = useState([]);
  const [staffNotificationSubject, setStaffNotificationSubject] = useState("");
  const [staffNotificationMessage, setStaffNotificationMessage] = useState("");
  const [staffSender, setStaffSender] = useState("admin");
  const [staffNotifications, setStaffNotifications] = useState([]);

  // Member Statuses
  const [memberStatuses, setMemberStatuses] = useState([]);

  // ─────────────────────────────────────────────────────────
  // Confirmation Dialog States
  // ─────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState(null);

  const openConfirmDialog = (title, message, callback) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => callback);
    setConfirmOpen(true);
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setConfirmTitle("");
    setConfirmMessage("");
    setConfirmCallback(null);
  };

  const handleConfirm = () => {
    if (confirmCallback) confirmCallback();
    handleCloseConfirm();
  };

  //formatter
  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const dateObj = new Date(dateString);
    return dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
  // ─────────────────────────────────────────────────────────
  // Snackbar
  // ─────────────────────────────────────────────────────────
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");

  const showSuccessMessage = (msg) => {
    setSnackMessage(msg);
    setSnackOpen(true);
  };

  // Automatically update membership statuses every 5 minutes
  useEffect(() => {
    const updateStatuses = async () => {
      try {
        await axios.get('/membership/update-statuses');
        console.log("Membership statuses updated successfully");
        // After updating, refresh any member-related data that's currently loaded
        loadMemberStatuses();
      } catch (error) {
        console.error("Error updating statuses:", error);
      }
    };
  
    updateStatuses(); // Run once on component mount
    const interval = setInterval(updateStatuses, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // ─────────────────────────────────────────────────────────
  // Lifecycle & Data Loading
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadAnnouncements();
    loadAllMembersMailjet();
    loadAllMembersSemaphore();
    loadMemberStatuses();
    loadStaffList();
  }, [activeTab]);

  // Load Mailjet activity logs when Mailjet tab is active
  useEffect(() => {
    if (activeTab === 1) {
      loadMailjetActivityLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 2) {
      loadSemaphoreActivityLogs();
    }
  }, [activeTab]);
  

  const loadAnnouncements = async () => {
    try {
      const res = await axios.get("/notifications/announcements");
      setAnnouncements(res.data || []);
    } catch (error) {
      console.error("Error loading announcements:", error);
      alert("Failed to load announcements.");
    }
  };

  const loadAllMembersMailjet = async () => {
    try {
      const res = await axios.get("/membership/members");
      setAllMembers(res.data.members || []);
    } catch (error) {
      console.error("Failed to load mailjet members:", error);
    }
  };

  const loadAllMembersSemaphore = async () => {
    try {
      const res = await axios.get("/membership/members");
      setSemaphoreMembers(res.data.members || []);
    } catch (error) {
      console.error("Failed to load semaphore members:", error);
    }
  };

  const loadMemberStatuses = async () => {
    try {
      const response = await axios.get("/membership/statuses");
      const fetchedStatuses = response.data || [];
      
      // Add "All" option at the beginning
      const statuses = [
        { id: "All", name: "All" },
        ...fetchedStatuses.map(status => ({
          id: status.MemberStatusID.toString(),
          name: status.StatusName
        }))
      ];
      
      setMemberStatuses(statuses);
    } catch (error) {
      console.error("Failed to load member statuses:", error);
      // Fallback to hardcoded values if API call fails
      const fallbackStatuses = [
        { id: "All", name: "All" },
        { id: "1", name: "ACTIVE" },
        { id: "2", name: "FROZEN" },
        { id: "3", name: "ON-HOLD" },
        { id: "4", name: "TERMINATED" },
        { id: "5", name: "EXPIRED" },
        { id: "6", name: "PENDING" },
        { id: "7", name: "INACTIVE" },
      ];
      setMemberStatuses(fallbackStatuses);
    }
  };

  const loadStaffList = async () => {
    try {
      const response = await axios.get("/staff");
      setStaffList(response.data || []);
    } catch (error) {
      console.error("Failed to load staff list:", error);
    }
  };

  const loadMailjetActivityLogs = async () => {
    try {
      const res = await axios.get("/notifications/mailjet-activity-logs");
      setMailjetActivityLogs(res.data.logs || []);
    } catch (error) {
      console.error("Error loading Mailjet logs:", error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Announcements
  // ─────────────────────────────────────────────────────────
  const handleAddAnnouncement = async () => {
    if (!newTopic.trim() || !newMessage.trim()) {
      alert("Please fill out both Topic and Message.");
      return;
    }
    try {
      const res = await axios.post("/notifications/announcements", {
        topic: newTopic,
        message: newMessage,
      });
      setAnnouncements((prev) => [res.data, ...prev]);
      setNewTopic("");
      setNewMessage("");
      showSuccessMessage("Announcement added!");
    } catch (error) {
      console.error("Add announcement failed:", error);
      alert("Failed to add announcement.");
    }
  };

  const handleEditOpen = (announcement) => {
    const lines = announcement.Message.split("\n");
    const rawTopic = lines[0].replace("Topic: ", "").trim();
    const rawMsg = lines.slice(1).join("\n").trim();
    setEditData({
      id: announcement.NotificationID,
      topic: rawTopic,
      message: rawMsg,
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    setEditData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSave = async () => {
    if (!editData.topic.trim() || !editData.message.trim()) {
      alert("Please fill out Topic and Message.");
      return;
    }
    try {
      const res = await axios.put(`/notifications/announcements/${editData.id}`, {
        topic: editData.topic,
        message: editData.message,
      });
      setAnnouncements((prev) =>
        prev.map((ann) =>
          ann.NotificationID === editData.id ? res.data : ann
        )
      );
      setEditOpen(false);
      showSuccessMessage("Announcement updated!");
    } catch (error) {
      console.error("Edit announcement failed:", error);
      alert("Failed to edit announcement.");
    }
  };

  const doDeleteAnnouncement = async (notifId) => {
    try {
      await axios.delete(`/notifications/announcements/${notifId}`);
      setAnnouncements((prev) =>
        prev.filter((a) => a.NotificationID !== notifId)
      );
      showSuccessMessage("Announcement deleted.");
    } catch (error) {
      console.error("Delete announcement failed:", error);
      alert("Failed to delete announcement.");
    }
  };

  const handleDeleteAnnouncement = (notifId) => {
    const ann = announcements.find((a) => a.NotificationID === notifId);
    if (!ann) return;
    openConfirmDialog(
      "Delete Announcement",
      `Are you sure you want to delete "${ann.Message.substring(0, 30)}..."?`,
      () => doDeleteAnnouncement(notifId)
    );
  };

  // ─────────────────────────────────────────────────────────
  // Staff-Specific Announcements
  // ─────────────────────────────────────────────────────────
  const handleStaffSelection = (staffIds) => {
    setSelectedStaff(staffIds);
  };

  const handleSendStaffAnnouncement = async () => {
    if (!staffSubject.trim() || !staffMessage.trim()) {
      alert("Please fill out the Subject and Message.");
      return;
    }
    if (selectedStaff.length === 0) {
      alert("Please select at least one staff member.");
      return;
    }
    const payload = {
      staffIds: selectedStaff,
      subject: staffSubject,
      message: staffMessage,
    };

    try {
      const resp = await axios.post("/notifications/send-staff", payload);
      showSuccessMessage(resp.data.message || "Staff notification sent!");
      setSelectedStaff([]);
      setStaffSubject("");
      setStaffMessage("");
    } catch (error) {
      console.error("Failed to send staff notification:", error);
      alert("Error sending staff notification.");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Mailjet
  // ─────────────────────────────────────────────────────────
  const handleMailjetSelection = (ids) => {
    setSelectedMailjetIDs(ids);
  };

  const doSendMailjetTemplate = async () => {
    try {
      const response = await axios.post("/notifications/send-mailjet-template", {
        templateId: Number(templateId),
        memberIds: selectedMailjetIDs,
      });

      if (response.data.status === "success") {
        showSuccessMessage("Template emails sent!");
        setSelectedMailjetIDs([]);
        loadMailjetActivityLogs();
      } else if (response.data.status === "no-action") {
        alert("No valid members or emails found.");
      } else {
        console.error("Mailjet error response:", response.data);
        alert("Some issue occurred. Check logs.");
      }
    } catch (error) {
      console.error("Mailjet template send failed:", error);
      alert("Failed to send Mailjet template.");
    }
  };

  const handleSendMailjetTemplate = () => {
    if (!templateId.trim()) {
      alert("Please enter the Mailjet Template ID.");
      return;
    }
    if (selectedMailjetIDs.length === 0) {
      alert("Please select at least one member.");
      return;
    }
    openConfirmDialog(
      "Send Templated Email",
      `Send Mailjet template #${templateId} to ${selectedMailjetIDs.length} member(s)?`,
      doSendMailjetTemplate
    );
  };

  // Transform logs: map MemberID to MemberName using allMembers
  const transposedLogs = mailjetActivityLogs.map((log) => {
    const member = allMembers.find((m) => m.MemberID === log.MemberID);
    return { 
      ...log, 
      MemberName: member ? member.FullName : String(log.MemberID) // Ensure it's a string
    };
});
const filteredLogs = transposedLogs.filter(
  (log) =>
    typeof log.MemberName === "string" &&
    log.MemberName.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    (typeof log.Message === "string" && log.Message.toLowerCase().includes(logSearchTerm.toLowerCase()))
);


  // Define columns for the Mailjet Activity Logs with custom rendering for Status
  const logColumns = [
    { field: "NotificationID", headerName: "ID", width: 70 },
    { field: "MemberName", headerName: "Member", width: 150 },
    {
      field: "Status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => {
        const status = params.value;
        let bgColor = "";
        if (status === "Sent") bgColor = "green";
        else if (status === "Failed") bgColor = "red";
        else if (status === "Pending") bgColor = "blue";
        else if (status === "Queued") bgColor = "orange";
        return <Chip label={status} style={{ backgroundColor: bgColor, color: "white" }} />;
      },
    },
    { field: "timestamp", headerName: "Sent Date", width: 250,  renderCell: (params) =>
      params.value ? formatDateTime(params.value) : "—",},
    { field: "Message", headerName: "Message", width: 250 },
  ];

  // Filter Mailjet members by end date, status, and search term
  const filteredMailjetMembers = React.useMemo(() => {
    // Set Manila timezone for all date operations
    const today = dayjs().tz("Asia/Manila").startOf('day');
    const next7 = dayjs().tz("Asia/Manila").add(7, 'day').startOf('day');
  
    return allMembers.filter((m) => {
      // Filter by search term on FullName or Email
      if (memberSearchTerm) {
        const search = memberSearchTerm.toLowerCase();
        if (
          !m.FullName.toLowerCase().includes(search) &&
          !m.Email.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      
      // Filter by membership end date
      if (mailjetEndDate) {
        if (!m.MembershipEndDate) return false;
        
        // Parse both dates with Manila timezone
        const endDate = dayjs(m.MembershipEndDate).tz("Asia/Manila").startOf('day');
        const selectedDate = dayjs(mailjetEndDate).tz("Asia/Manila").startOf('day');
        
        // Compare dates
        if (!endDate.isSame(selectedDate, 'day')) {
          return false;
        }
      }
      
      // Filter by member status
      if (mailjetFilterStatus !== "All") {
        const statusId = parseInt(mailjetFilterStatus, 10);
        if (m.MemberStatusID !== statusId) {
          return false;
        }
      }
      
      if (mailjetShowExpiring) {
        if (!m.MembershipEndDate) return false;
        
        // Parse end date with Manila timezone
        const endDate = dayjs(m.MembershipEndDate).tz("Asia/Manila").startOf('day');
        
        // Check if end date is within the next 7 days (not expired, not too far)
        if (endDate.isBefore(today) || endDate.isAfter(next7)) {
          return false;
        }
      }
      return true;
    });
  }, [allMembers, mailjetEndDate, mailjetFilterStatus, mailjetShowExpiring, memberSearchTerm]);

  const handleSendExpiryReminderSelected = async () => {
    if (selectedMailjetIDs.length === 0) {
      alert("Please select at least one member.");
      return;
    }
    try {
      const response = await axios.post(
        "/notifications/send-expiring-reminder-selected",
        { memberIds: selectedMailjetIDs }
      );
      if (response.data.status === "success") {
        showSuccessMessage("Expiry reminders sent for selected members!");
      } else {
        alert(response.data.message || "Some issue occurred. Check logs.");
      }
      setSelectedMailjetIDs([]);
    } catch (error) {
      console.error("Failed to send expiry reminders for selected members:", error);
      alert("Error sending expiry reminders for selected members.");
    }
  };

  const handleSendExpiryReminder = async () => {
    try {
      const res = await axios.get("/notifications/send-expiring-reminder");
      if (res.data.status === "success") {
        showSuccessMessage("Expiry reminder emails sent!");
      } else if (res.data.status === "no-action") {
        alert("No members expiring in 7 days.");
      } else {
        alert("An error occurred. Please check the logs.");
      }
    } catch (error) {
      console.error("Failed to send expiring reminder:", error);
      alert("Failed to send expiry reminder.");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Semaphore
  // ─────────────────────────────────────────────────────────
  const handleSemaphoreSelection = (ids) => {
    setSelectedSemaphoreIDs(ids);
  };

  const handleAutoFillSemaphoreNumbers = () => {
    const selectedRows = semaphoreMembers.filter((m) =>
      selectedSemaphoreIDs.includes(m.MemberID)
    );

    const phones = selectedRows
      .map((m) => {
        if (!m.Phone) return null;
        let formatted = m.Phone.replace(/\D/g, "");
        if (formatted.startsWith("09")) {
          formatted = "63" + formatted.substring(1);
        }
        return formatted;
      })
      .filter(Boolean);

    if (phones.length === 0) {
      alert("No valid phone numbers among selected members.");
      return;
    }
    setSemaphoreNumbers(phones.join(","));
  };

  const doSendSemaphoreSMS = async () => {
    const payload = {
      numbers: semaphoreNumbers,
      message: semaphoreMessage,
      senderName: semaphoreSenderName || "Contnental",
    };
    try {
      const resp = await axios.post("/notifications/send-semaphore-sms", payload);
      if (resp.data.status === "success" || resp.data.status === "partial") {
        showSuccessMessage(
          `SMS sent successfully!`
        );
        setSemaphoreNumbers("");
        setSemaphoreMessage("");
        setSemaphoreSenderName("");
      } else {
        console.error("Semaphore API Response Error:", resp.data);
        alert(`Something went wrong: ${resp.data.message}`);
      }
    } catch (error) {
      console.error("Semaphore SMS error:", error);
      alert("Error sending Semaphore SMS. Check logs.");
    }
  };

  const handleSendSemaphoreSMS = () => {
    if (!semaphoreNumbers.trim()) {
      alert("Please provide at least one mobile number.");
      return;
    }
    if (!semaphoreMessage.trim()) {
      alert("Please enter your SMS message.");
      return;
    }
    openConfirmDialog(
      "Send SMS",
      `Send the above message to:\n${semaphoreNumbers}`,
      doSendSemaphoreSMS
    );
  };

  const loadSemaphoreActivityLogs = async () => {
    try {
      // Make sure this endpoint exists on your backend and returns logs similar to Mailjet logs.
      const res = await axios.get("/notifications/semaphore-activity-logs");
      setSemaphoreActivityLogs(res.data.logs || []);
    } catch (error) {
      console.error("Error loading Semaphore logs:", error);
    }
  };
  
  // Filter Semaphore members by end date, status, and search term
  const filteredSemaphoreMembers = React.useMemo(() => {
    return semaphoreMembers.filter((m) => {
      // Filter by search term
      let matchesSearch = true;
      if (semaphoreSearchTerm.trim()) {
        const search = semaphoreSearchTerm.toLowerCase();
        matchesSearch =
          m.FullName.toLowerCase().includes(search) ||
          (m.Phone && m.Phone.toLowerCase().includes(search));
      }
      
      // Filter by membership end date
      if (semaphoreEndDate) {
        if (!m.MembershipEndDate) return false;
        
        // Parse both dates with Manila timezone
        const endDate = dayjs(m.MembershipEndDate).tz("Asia/Manila").startOf('day');
        const selectedDate = dayjs(semaphoreEndDate).tz("Asia/Manila").startOf('day');
        
        // Compare dates
        if (!endDate.isSame(selectedDate, 'day')) {
          return false;
        }
      }
      
      // Filter by member status
      if (semaphoreFilterStatus !== "All") {
        const statusId = parseInt(semaphoreFilterStatus, 10);
        if (m.MemberStatusID !== statusId) {
          return false;
        }
      }
      
      return matchesSearch;
    });
  }, [semaphoreMembers, semaphoreEndDate, semaphoreFilterStatus, semaphoreSearchTerm]);

  // Transform logs to include a MemberName similar to Mailjet logs
const transposedSemaphoreLogs = semaphoreActivityLogs.map((log) => {
  const member = semaphoreMembers.find((m) => m.MemberID === log.MemberID);
  return {
    ...log,
    MemberName: member ? member.FullName : String(log.MemberID),
  };
});

// Filter logs based on search term
const filteredSemaphoreLogs = transposedSemaphoreLogs.filter(
  (log) =>
    (typeof log.MemberName === "string" &&
      log.MemberName.toLowerCase().includes(semaphoreLogSearchTerm.toLowerCase())) ||
    (typeof log.Message === "string" &&
      log.Message.toLowerCase().includes(semaphoreLogSearchTerm.toLowerCase()))
);

  // ─────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Notifications & Announcements
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* ---------------------- OVERVIEW CARDS ---------------------- */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              borderTop: '4px solid #3f51b5'
            }}
          >
            <Typography variant="h6" gutterBottom>Overall Members</Typography>
            <Typography variant="h3">{allMembers.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              borderTop: '4px solid green'
            }}
          >
            <Typography variant="h6" gutterBottom>Active Members</Typography>
            <Typography variant="h3">
              {allMembers.filter(m => m.MemberStatusID === 1).length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              borderTop: '4px solid purple'
            }}
          >
            <Typography variant="h6" gutterBottom>Membership Due</Typography>
            <Typography variant="h3">
              {allMembers.filter(m => m.MemberStatusID === 6).length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              borderTop: '4px solid red'
            }}
          >
            <Typography variant="h6" gutterBottom>Membership Expired</Typography>
            <Typography variant="h3">
              {allMembers.filter(m => m.MemberStatusID === 5).length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab icon={<CampaignIcon />} label="Announcements" />
        <Tab icon={<EmailIcon />} label="Mailjet" />
        <Tab icon={<ForumIcon />} label="Semaphore" />
      </Tabs>

      {/* ---------------------- TAB 0: Announcements & Staff Notifications ---------------------- */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* ==================== Add a General Announcement ==================== */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6">Add Announcement</Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Topic"
                  fullWidth
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CampaignIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Message"
                  fullWidth
                  multiline
                  rows={2}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddAnnouncement}
                >
                  Add Announcement
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* ==================== Display Recent Announcements ==================== */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Recent Announcements
              </Typography>
              {announcements.length === 0 ? (
                <Typography>No announcements yet...</Typography>
              ) : (
                announcements.map((ann) => {
                  const lines = ann.Message.split("\n");
                  const parsedTopic = lines[0].replace("Topic: ", "").trim();
                  const parsedMsg = lines.slice(1).join("\n").trim();
                  return (
                    <Box
                      key={ann.NotificationID}
                      sx={{
                        border: "1px solid #ccc",
                        borderRadius: 1,
                        p: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        {parsedTopic}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                        {parsedMsg}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditOpen(ann)}
                          >
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            sx={{ color: "red", ml: 1 }}
                            onClick={() =>
                              handleDeleteAnnouncement(ann.NotificationID)
                            }
                          >
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ---------------------- TAB 1: Mailjet ---------------------- */}
      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Mailjet Templated Email
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Need to create or edit a new template?{" "}
            <a
              href="https://app.mailjet.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "blue", textDecoration: "underline" }}
            >
              Go to Mailjet Dashboard
            </a>
          </Typography>

          {!mailjetShowExpiring && (
            <Stack spacing={2} sx={{ mb: 2, maxWidth: 400 }}>
              <TextField
                label="Mailjet Template ID"
                fullWidth
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          )}

          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <Box sx={{ minWidth: 200 }}>
              <TextField
                label="Filter by Membership End Date"
                type="date"
                value={mailjetEndDate}
                onChange={(e) => setMailjetEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={mailjetFilterStatus}
                  label="Filter by Status"
                  onChange={(e) => setMailjetFilterStatus(e.target.value)}
                >
                  {memberStatuses.map((st) => (
                    <MenuItem key={st.id} value={st.id}>
                      {st.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={mailjetShowExpiring}
                  onChange={(e) => setMailjetShowExpiring(e.target.checked)}
                  color="primary"
                />
              }
              label="Expiring in 7 days"
            />
          </Box>

          <Grid container spacing={2}>
            {/* Left: Member Selection DataGrid */}
            <Grid item xs={6}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Select Members to Receive the Template
              </Typography>
              <TextField
                label="Search Members"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                sx={{ mb: 1, maxWidth: 300 }}
                fullWidth
              />

              <div style={{ width: "100%", height: 400 }}>
                <DataGrid
                  rows={filteredMailjetMembers}
                  columns={mailjetColumns}
                  getRowId={(row) => row.MemberID}
                  checkboxSelection
                  onRowSelectionModelChange={(newSelection) => {
                    handleMailjetSelection(newSelection.map(Number));
                  }}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10]}
                />
              </div>
            </Grid>

            {/* Right: Email Activity Logs */}
            <Grid item xs={6}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Email Activity Logs
              </Typography>
              <TextField
                label="Search Logs"
                fullWidth
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                sx={{ mb: 1 }}
              />
              <div style={{ width: "100%", height: 400 }}>
                <DataGrid
                  rows={filteredLogs}
                  columns={logColumns}
                  getRowId={(row) => row.NotificationID}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10]}
                />
              </div>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            {mailjetShowExpiring ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleSendExpiryReminder}
                >
                  Send Expiry Reminders to All Expiring Members
                </Button>
                {selectedMailjetIDs.length > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={handleSendExpiryReminderSelected}
                  >
                    Send Expiry Reminder to Selected Members
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleSendMailjetTemplate}
              >
                Send Templated Email
              </Button>
            )}
          </Box>
        </Paper>    
      )}

      {/* ---------------------- TAB 2: Semaphore ---------------------- */}
      {activeTab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Send SMS via Semaphore
          </Typography>
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <Box sx={{ minWidth: 200 }}>
              <TextField
                label="Filter by Membership End Date"
                type="date"
                value={semaphoreEndDate}
                onChange={(e) => setSemaphoreEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={semaphoreFilterStatus}
                  label="Filter by Status"
                  onChange={(e) => setSemaphoreFilterStatus(e.target.value)}
                >
                  {memberStatuses.map((st) => (
                    <MenuItem key={st.id} value={st.id}>
                      {st.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          {/* New search field for member filtering */}
          <TextField
            label="Search Members"
            fullWidth
            value={semaphoreSearchTerm}
            onChange={(e) => setSemaphoreSearchTerm(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Grid container spacing={2}>
            {/* Left Column: Member Selection & SMS Sending */}
            <Grid item xs={6}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                (Optional) Select members to pull their phone numbers
              </Typography>
              <div style={{ width: "100%", height: 300, marginBottom: 16 }}>
                <DataGrid
                  rows={filteredSemaphoreMembers}
                  columns={semaphoreColumns}
                  getRowId={(row) => row.MemberID}
                  checkboxSelection
                  rowSelectionModel={selectedSemaphoreIDs}
                  onRowSelectionModelChange={(newSelection) => {
                    setSelectedSemaphoreIDs(newSelection.map(Number));
                  }}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10]}
                />
              </div>
              <Button
                variant="outlined"
                sx={{ mb: 2 }}
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleAutoFillSemaphoreNumbers}
              >
                Auto-Fill from Selected
              </Button>
              <Stack spacing={2} sx={{ maxWidth: 600 }}>
                <TextField
                  label="Recipient Number(s)"
                  placeholder='e.g. "09998887777,09171234567"'
                  fullWidth
                  value={semaphoreNumbers}
                  onChange={(e) => setSemaphoreNumbers(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ForumIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="SMS Message (1 Credit = 160 characters)"
                  multiline
                  rows={4}
                  fullWidth
                  value={semaphoreMessage}
                  onChange={(e) => setSemaphoreMessage(e.target.value)}
                  helperText={`Current characters: ${semaphoreMessage.length}. Exceeding 160 characters will require an additional credit.`}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CampaignIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  onClick={handleSendSemaphoreSMS}
                >
                  Send via Semaphore
                </Button>
              </Stack>
            </Grid>
            {/* Right Column: SMS Activity Logs */}
            <Grid item xs={6}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                SMS Activity Logs
              </Typography>
              <TextField
                label="Search Logs"
                fullWidth
                value={semaphoreLogSearchTerm}
                onChange={(e) => setSemaphoreLogSearchTerm(e.target.value)}
                sx={{ mb: 1 }}
              />
              <div style={{ width: "100%", height: 400 }}>
                <DataGrid
                  rows={filteredSemaphoreLogs}
                  columns={logColumns} // reusing your existing logColumns array
                  getRowId={(row) => row.NotificationID}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10]}
                />
              </div>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ================== EDIT ANNOUNCEMENT DIALOG ================== */}
      <Dialog
        open={isEditOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Announcement</DialogTitle>
        <DialogContent dividers>
          {editData && (
            <>
              <TextField
                label="Topic"
                fullWidth
                margin="normal"
                name="topic"
                value={editData.topic}
                onChange={handleEditChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CampaignIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Message"
                fullWidth
                multiline
                rows={3}
                margin="normal"
                name="message"
                value={editData.message}
                onChange={handleEditChange}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================== CONFIRMATION DIALOG ================== */}
      <Dialog open={confirmOpen} onClose={handleCloseConfirm}>
        <DialogTitle>{confirmTitle}</DialogTitle>
        <DialogContent dividers>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================== SNACKBAR FOR SUCCESS ================== */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message={snackMessage}
      />
    </Box>
  );
}
