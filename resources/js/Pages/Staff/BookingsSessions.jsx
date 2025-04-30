// At the top of the file add a note about the changes
// Payments for facility bookings and coach sessions must now be created manually through the Payment interface

import React, { useState, useEffect, useMemo} from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
  Grid,
  List,
  ListItemText,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  useTheme,
  useMediaQuery,
  OutlinedInput,
  InputAdornment,
  Autocomplete,
  MenuItem as MuiMenuItem,
  Snackbar,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Alert
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

// ICONS
import StoreIcon from "@mui/icons-material/Store";
import EventNoteIcon from "@mui/icons-material/EventNote";
import GroupIcon from "@mui/icons-material/Group";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BusinessIcon from "@mui/icons-material/Business";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import EmailIcon from '@mui/icons-material/Email';
import EventIcon from "@mui/icons-material/Event";
import CategoryIcon from "@mui/icons-material/Category";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import TimelapseIcon from "@mui/icons-material/Timelapse";
import GroupsIcon from "@mui/icons-material/Groups";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import InfoIcon from "@mui/icons-material/Info";
import PaymentIcon from "@mui/icons-material/Payment";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ScheduleIcon from "@mui/icons-material/ScheduleOutlined";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PhoneIcon from "@mui/icons-material/Phone";
import SportsIcon from "@mui/icons-material/Sports";
import PeopleIcon from "@mui/icons-material/People";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

import dayjs from "dayjs";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { styled } from "@mui/material/styles";

// React Big Calendar
import moment from "moment";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";

// MUI X Date Pickers
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DesktopDateTimePicker } from "@mui/x-date-pickers/DesktopDateTimePicker";

import ManageAvailabilityDialog from "../../Layouts/ManageAvailabilityDialog";


const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(BigCalendar);

const BigCalendarWrapper = styled("div")(({ theme }) => ({
  ".rbc-calendar": {
    height: "730px",
    borderRadius: 4,
  },
  ".rbc-month-view, .rbc-time-view": {
    backgroundColor:
      theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff",
    color: theme.palette.text.primary,
  },
  ".rbc-off-range-bg": {
    backgroundColor:
      theme.palette.mode === "dark" ? "#2b2b2b" : "#f0f0f0",
    opacity: 0.9,
  },
  ".rbc-day-bg": {
    borderColor: theme.palette.divider,
  },
  ".rbc-today": {
    backgroundColor:
      theme.palette.mode === "dark" ? "#424242" : "#e3f2fd",
  },
  ".rbc-event": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderRadius: 4,
  },
  ".rbc-show-more": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.primary.dark
        : theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
}));

function formatTime(timeString) {
  if (!timeString) return "—";
  const timeObj = dayjs(timeString, "HH:mm:ss", true);
  return timeObj.isValid() ? timeObj.format("h:mm A") : "Invalid Time";
}

function createCalendarEvents(bookings, sessions, sessionBookings) {
  // Build a quick lookup (SessionID -> sessionObj).
  const sessionMap = {};
  sessions.forEach((s) => {
    sessionMap[s.SessionID] = s;
  });

  // 1) Convert facility bookings to events
  const bookingEvents = bookings.map((b) => {
    const displayName = b.MemberName || b.GuestName || 'Unknown';
    return {
      id: `booking-${b.BookingID}`,
      date: b.BookingDate,
      title: `Booking: ${displayName} (${formatTime(b.BookingTime)})`,
      type: "booking",
    };
  });

  // 2) Convert session bookings to events
  const sessionBookingEvents = sessionBookings.map((sb) => {
    // find the session this booking is for
    const sessionObj = sessionMap[sb.SessionID];

    // fallback if not found
    if (!sessionObj) {
      return {
        id: `sb-${sb.SessionBookingID}`,
        date: sb.BookingDate,
        title: `Session Booking (Missing Session Data) - (Member: ${sb.MemberName})`,
        type: "sessionBooking",
      };
    }

    // we have the session; let's build a nice label
    const timeFrame = sessionObj.StartTime && sessionObj.EndTime
      ? `(${dayjs(sessionObj.StartTime).format("h:mm A")} - ${dayjs(sessionObj.EndTime).format("h:mm A")})`
      : "";
    const coachName = sessionObj.CoachName || "Unassigned";
    const sessionName = sessionObj.SessionName || "Unknown Session";

    return {
      id: `sb-${sb.SessionBookingID}`,
      date: sb.BookingDate,
      title: `Session: ${sessionName} w/ Coach: ${coachName} → Booked by ${sb.MemberName} ${timeFrame}`,
      type: "sessionBooking",
    };
  });

  // 3) Return everything
  return [...bookingEvents, ...sessionBookingEvents];
}

export default function BookingsSessions() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));

  const [bookings, setBookings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionBookings, setSessionBookings] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);

  const [coaches, setCoaches] = useState([]);
  const [members, setMembers] = useState([]);
  const [facilities, setFacilities] = useState([]);

  // We'll keep "all" as the initial value, then override it once we fetch the staff data.
  const [branchFilter, setBranchFilter] = useState("all");
  
  // Example: You can track loading if needed
  const [loading, setLoading] = useState(true);

  // For the sake of example, you have branches hardcoded:
  const [branches] = useState([
    { value: "1", label: "Contnental Branch 1" },
    { value: "2", label: "Contnental Branch 2" },
  ]);

  // (1) Fetch the staff's default branch from /staff/authuser
  //     and override branchFilter if we succeed.
  useEffect(() => {
    axios
      .get("/staff/authuser")
      .then((res) => {
        const staffData = res.data;
        if (staffData.DefaultBranchID) {
          setBranchFilter(String(staffData.DefaultBranchID));
        }
      })
      .catch((err) => {
        console.error("Error fetching default branch:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Then your existing fetchAllData call (which does not conflict with setting branchFilter)
  useEffect(() => {
    fetchAllData();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  const [exportAnchor, setExportAnchor] = useState(null);
  const openExport = Boolean(exportAnchor);

  // Calendar
  const [isAddCalendarEventOpen, setAddCalendarEventOpen] = useState(false);
  const [isEditEventOpen, setEditEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Booking dialogs
  const [isAddBookingOpen, setAddBookingOpen] = useState(false);
  const [viewBookingModal, setViewBookingModal] = useState(false);
  const [editBookingModal, setEditBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Confirmation
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [dialogType, setDialogType] = useState(""); // "booking" | "session" | "coach"

  // Session dialogs
  const [isAddSessionOpen, setAddSessionOpen] = useState(false);
  const [viewSessionModal, setViewSessionModal] = useState(false);
  const [editSessionModal, setEditSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Book session
  const [isBookSessionOpen, setBookSessionOpen] = useState(false);
  const [sessionToBook, setSessionToBook] = useState(null);
  const [sessionBookingMemberID, setSessionBookingMemberID] = useState("");
  const [sessionBookingDate, setSessionBookingDate] = useState("");
  const [sessionBookingStatus, setSessionBookingStatus] = useState("Pending");

  // Timeslot generation
  const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    coachId: "",
    startDate: "",
    endDate: "",
    branchId: "",
    location: "",
    sessionType: "Regular",
    fee: 0,
  });

  // Coach dialogs
  const [isAddCoachOpen, setAddCoachOpen] = useState(false);
  const [viewCoachModal, setViewCoachModal] = useState(false);
  const [editCoachModal, setEditCoachModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [newCoach, setNewCoach] = useState({
    FullName: "",
    Specialty: "",
    ContactInfo: "",
    // Email is also used in the form below
  });

  // New booking
  const [newBooking, setNewBooking] = useState({
    bookingType: "member", // "member" or "guest"
    MemberID: "",
    GuestName: "",
    GuestEmail: "",
    FacilityID: "",
    BookingDate: "",
    BookingTime: "",
    Duration: "",
    Status: "Pending",
    PaymentMethod: "Cash",
    PaymentAmount: "",
  });
  const [selectedBranchForBooking, setSelectedBranchForBooking] = useState(""); // ?

  // New session
  const [newSession, setNewSession] = useState({
    BranchID: "",
    SessionName: "",
    SessionType: "",
    CoachID: "",
    StartTime: "",
    EndTime: "",
    Capacity: "",
    Location: "",
    Fee: "",
  });

  const STATUS_OPTIONS = ["Confirmed", "Pending", "Cancelled", "Completed"];
  const PAYMENT_METHODS = ["Cash", "GCash", "BPI", "BDO"];

  // Form validations
  const isValidBooking = () => {
    if (newBooking.bookingType === "member") {
      return (
        newBooking.MemberID &&
        newBooking.FacilityID &&
        newBooking.BookingDate.trim() !== "" &&
        newBooking.BookingTime.trim() !== ""
      );
    } else {
      return (
        newBooking.GuestName.trim() !== "" &&
        newBooking.GuestEmail.trim() !== "" &&
        newBooking.FacilityID &&
        newBooking.BookingDate.trim() !== "" &&
        newBooking.BookingTime.trim() !== ""
      );
    }
  };
  const [isSubmitEnabledBooking, setIsSubmitEnabledBooking] = useState(false);
  useEffect(() => {
    setIsSubmitEnabledBooking(isValidBooking());
  }, [selectedBranchForBooking, newBooking]);

  const isValidSession = () => {
    return (
      newSession.SessionName.trim() !== "" &&
      newSession.SessionType.trim() !== "" &&
      newSession.StartTime.trim() !== "" &&
      newSession.EndTime.trim() !== "" &&
      newSession.Capacity.toString().trim() !== "" &&
      newSession.Location.trim() !== "" &&
      newSession.BranchID &&
      newSession.CoachID
    );
  };
  const [isSubmitEnabledSession, setIsSubmitEnabledSession] = useState(false);
  useEffect(() => {
    setIsSubmitEnabledSession(isValidSession());
  }, [newSession]);

  const isValidCoach = () => {
    return (
      newCoach.FullName.trim() !== "" &&
      newCoach.Specialty.trim() !== "" &&
      newCoach.ContactInfo.trim() !== ""
    );
  };
  const [isSubmitEnabledCoach, setIsSubmitEnabledCoach] = useState(false);
  useEffect(() => {
    setIsSubmitEnabledCoach(isValidCoach());
  }, [newCoach]);

  // Snack / Alert
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("info");
  const showSnack = (message, severity = "info") => {
    setSnackMessage(message);
    setSnackSeverity(severity);
    setSnackOpen(true);
  };
  
  useEffect(() => {
    // 'getBranchLabel' is your helper that converts branchFilter to "Contnental Branch 1", etc.
    const selectedBranchLabel = getBranchLabel(branchFilter);
  
    // 1) Filter bookings
    //   (Here, we assume each booking has a .Branch that's a human-readable string like "Contnental Branch 1".)
    const filteredBookings = bookings.filter(b => {
      if (branchFilter === "all") return true;
      return b.Branch === selectedBranchLabel; 
    });
  
    // 2) Filter sessions
    const filteredSessions = sessions.filter(s => {
      if (branchFilter === "all") return true;
      return s.Branch === selectedBranchLabel;
    });
  
    // 3) Filter sessionBookings
    //    (sessionBookings might not directly contain .Branch,
    //     so we find the corresponding session to check its branch.)
    const filteredSessionBookings = sessionBookings.filter(sb => {
      const sessionObj = sessions.find(s => s.SessionID === sb.SessionID);
      if (!sessionObj) return false; // or true/false depending on your logic
      if (branchFilter === "all") return true;
      return sessionObj.Branch === selectedBranchLabel;
    });
  
    // 4) Now build the calendar events from these filtered arrays
    const mergedEvents = createCalendarEvents(
      filteredBookings,
      filteredSessions,
      filteredSessionBookings
    );
  
    // 5) Update state
    setCalendarEvents(mergedEvents);
  
  }, [branchFilter, bookings, sessions, sessionBookings]);

  async function fetchAllData() {
    try {
      // 1) Bookings
      const bookingRes = await axios.get("/booking");
      const loadedBookings = bookingRes.data.bookings.map((b) => ({
        ...b,
        BookingTime: dayjs(b.BookingTime, "HH:mm:ss").isValid()
          ? dayjs(b.BookingTime, "HH:mm:ss").format("HH:mm:ss")
          : "00:00:00",
      }));

      // 2) Sessions
      const sessionRes = await axios.get("/booking/sessions");
      const loadedSessions = sessionRes.data.sessions || [];

      // 3) Session Bookings
      const sbRes = await axios.get("/booking/sessions/bookings");
      const loadedSessionBookings = sbRes.data.session_bookings || [];

      // 4) Members
      const membersRes = await axios.get("/membership/members");
      const loadedMembers = membersRes.data.members || [];

      // 5) Facilities
      const facRes = await axios.get("/facilities");
      const loadedFacilities = facRes.data.facilities || [];

      // 6) Coaches
      const coachesRes = await axios.get("/coaches?with=availabilities");
      const loadedCoaches = coachesRes.data.coaches || [];

      // Set them
      setBookings(loadedBookings);
      setSessions(loadedSessions);
      setSessionBookings(loadedSessionBookings);
      setMembers(loadedMembers);
      setFacilities(loadedFacilities);
      setCoaches(loadedCoaches);

    } catch (err) {
      console.error("Failed to load data:", err);
      showSnack("Failed to load data. Check console.", "error");
    }
  }

  // Format helpers
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return dayjs(dateString).format("MMM D, YYYY");
  };
  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const parsed = dayjs(dateString);
    return parsed.isValid() ? parsed.format("MMM D, YYYY h:mm A") : "Invalid DateTime";
  };

  function getBranchLabel(value) {
    if (value === "all") return null;
    const found = branches.find((b) => b.value === value);
    return found ? found.label : null;
  }

  // ---------- FILTERS ----------
  const filteredBookings = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const selectedBranchLabel = getBranchLabel(branchFilter);

    return bookings.filter((b) => {
      const branchMatches =
        branchFilter === "all" || b.Branch === selectedBranchLabel;
      const textFields = [b.MemberName, b.FacilityName, b.Status].join(" ");
      const searchMatches = textFields.toLowerCase().includes(lowerSearch);

      return branchMatches && searchMatches;
    });
  }, [bookings, branchFilter, searchTerm]);

  const filteredSessions = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const selectedBranchLabel = getBranchLabel(branchFilter);

    return sessions.filter((s) => {
      const branchMatches =
        branchFilter === "all" || s.Branch === selectedBranchLabel;
      const textFields = [s.SessionName, s.CoachName, s.Location, s.Status].join(" ");
      const searchMatches = textFields.toLowerCase().includes(lowerSearch);

      return branchMatches && searchMatches;
    });
  }, [sessions, branchFilter, searchTerm]);

  const filteredCoaches = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    // Possibly no branch logic for coaches in your data:
    return coaches.filter((c) => {
      const textFields = [
        c.FullName || "",
        c.Specialty || "",
        c.ContactInfo || "",
      ].join(" ");
      return textFields.toLowerCase().includes(lowerSearch);
    });
  }, [coaches, searchTerm]);

  // ---------- CALENDAR EVENTS ----------
  const bigCalendarEvents = calendarEvents.map((event) => {
    if (event.start && event.end) {
      return { ...event, start: new Date(event.start), end: new Date(event.end) };
    } else if (event.date) {
      const d = new Date(event.date);
      return { ...event, start: d, end: d, allDay: true };
    }
    return event;
  });

  const handleDateClick = (info) => {
    const clickedDate = new Date(info.dateStr);
    if (clickedDate < new Date()) return;
    setSelectedDate(clickedDate);
    setAddCalendarEventOpen(true);
  };
  const handleEventDrop = (info) => {
    const eventId = info.event.id;
    const newDateStr = info.event.start.toISOString();
    setCalendarEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, date: newDateStr } : ev))
    );
  };
  const handleSaveCalendarEvent = (title, desc, start, end) => {
    const newEv = {
      id: Date.now().toString(),
      date: selectedDate?.toISOString().split("T")[0] || "2025-01-01",
      title: `${title} (${start} - ${end})`,
      description: desc,
    };
    setCalendarEvents((prev) => [...prev, newEv]);
    setAddCalendarEventOpen(false);
  };
  const handleEditEvent = (id) => {
    const found = calendarEvents.find((ev) => ev.id === id);
    if (found) {
      setSelectedEvent(found);
      setEditEventOpen(true);
    }
  };
  const handleDeleteEvent = (id) => {
    setCalendarEvents((prev) => prev.filter((ev) => ev.id !== id));
  };
  const handleSaveEditedEvent = () => {
    if (!selectedEvent) return;
    setCalendarEvents((prev) =>
      prev.map((ev) => (ev.id === selectedEvent.id ? selectedEvent : ev))
    );
    setEditEventOpen(false);
  };

  // ---------- BOOKING HANDLERS ----------
  function handleViewBooking(bookingId) {
    const found = bookings.find((b) => b.BookingID === bookingId);
    if (found) {
      setSelectedBooking(found);
      setViewBookingModal(true);
    }
  }
  async function handleCreateBooking() {
    try {
      const payload = {
        FacilityID: newBooking.FacilityID,
        BookingDate: newBooking.BookingDate,
        BookingTime: newBooking.BookingTime,
        Duration: newBooking.Duration || 1,
        Status: newBooking.Status || "Pending"
      };

      if (newBooking.bookingType === "member") {
        payload.MemberID = newBooking.MemberID || null;
        payload.GuestName = null;
        payload.GuestEmail = null;
      } else {
        payload.MemberID = null;
        payload.GuestName = newBooking.GuestName;
        payload.GuestEmail = newBooking.GuestEmail;
      }

      await axios.post("/booking", payload);
      setAddBookingOpen(false);
      fetchAllData();
      showSnack("Booking created successfully! Please create payment separately.", "success");
    } catch (err) {
      console.error("Failed to create booking:", err);
      showSnack("Error creating booking. Check console.", "error");
    }
  }
  async function handleDeleteBooking(bookingId) {
    try {
      await axios.delete(`/booking/${bookingId}`);
      setBookings((prev) => prev.filter((b) => b.BookingID !== bookingId));
      setCalendarEvents((prev) => prev.filter((ev) => ev.id !== `booking-${bookingId}`));
      showSnack("Booking deleted successfully.", "success");
    } catch (err) {
      console.error("Failed to delete booking:", err);
      showSnack("Error deleting booking. Check console.", "error");
    }
  }
  function handleEditBooking(bookingId) {
    const found = bookings.find((b) => b.BookingID === bookingId);
    if (!found) return;
    const isMember = !!found.MemberID;
    setSelectedBooking({
      ...found,
      bookingType: isMember ? "member" : "guest",
      GuestName: isMember ? "" : found.GuestName || "",
      GuestEmail: isMember ? "" : found.GuestEmail || ""
    });
    setEditBookingModal(true);
  }
  async function handleUpdateBooking() {
    if (!selectedBooking) return;
    const payload = {
      FacilityID: selectedBooking.FacilityID,
      BookingDate: selectedBooking.BookingDate,
      BookingTime: selectedBooking.BookingTime,
      Duration: selectedBooking.Duration,
      Status: selectedBooking.Status
    };
    if (selectedBooking.bookingType === "member") {
      payload.MemberID = selectedBooking.MemberID;
      payload.GuestName = null;
      payload.GuestEmail = null;
    } else {
      payload.MemberID = null;
      payload.GuestName = selectedBooking.GuestName;
      payload.GuestEmail = selectedBooking.GuestEmail;
    }

    try {
      await axios.put(`/booking/${selectedBooking.BookingID}`, payload);
      setEditBookingModal(false);
      fetchAllData();
      showSnack("Booking updated! Payment details can be updated separately.", "success");
    } catch (err) {
      console.error("Failed to update booking:", err);
      showSnack("Error updating booking.", "error");
    }
  }

  // ---------- SESSIONS ----------
  function handleViewSession(sessionId) {
    const found = sessions.find((s) => s.SessionID === sessionId);
    if (found) {
      setSelectedSession(found);
      setViewSessionModal(true);
    }
  }
  function handleEditSession(sessionId) {
    const found = sessions.find((s) => s.SessionID === sessionId);
    if (found) {
      setSelectedSession({
        ...found,
        StartTime: dayjs(found.StartTime).format("YYYY-MM-DD HH:mm:ss"),
        EndTime: dayjs(found.EndTime).format("YYYY-MM-DD HH:mm:ss"),
      });
      setEditSessionModal(true);
    }
  }
  async function handleCreateSession() {
    const coach = coaches.find((c) => c.CoachID === newSession.CoachID);
    if (!coach) {
      showSnack("Please select a valid coach.", "error");
      return;
    }
    const sessionStart = dayjs(newSession.StartTime);
    const sessionEnd = dayjs(newSession.EndTime);
    const validSlot = coach.availabilities?.some((slot) => {
      const slotStart = dayjs(slot.Start);
      const slotEnd = dayjs(slot.End);
      return !sessionStart.isBefore(slotStart) && !sessionEnd.isAfter(slotEnd);
    });
    if (!validSlot) {
      showSnack("Session time is outside the coach's availability window!", "error");
      return;
    }
    try {
      await axios.post("/booking/sessions", {
        BranchID: newSession.BranchID,
        SessionName: newSession.SessionName,
        SessionType: newSession.SessionType,
        CoachID: newSession.CoachID,
        StartTime: newSession.StartTime,
        EndTime: newSession.EndTime,
        Capacity: newSession.Capacity,
        Location: newSession.Location,
        Fee: newSession.Fee,
      });
      setAddSessionOpen(false);
      fetchAllData();
      showSnack("Session created!", "success");
    } catch (err) {
      console.error("Failed to create session:", err);
      showSnack("Error creating session. Check console for details.", "error");
    }
  }
  async function handleUpdateSession() {
    if (!selectedSession) return;
    const coach = coaches.find((c) => c.CoachID === selectedSession.CoachID);
    if (!coach) {
      showSnack("Please select a valid coach.", "error");
      return;
    }
    const sessionStart = dayjs(selectedSession.StartTime);
    const sessionEnd = dayjs(selectedSession.EndTime);
    const validSlot = coach.availabilities?.some((slot) => {
      const slotStart = dayjs(slot.Start);
      const slotEnd = dayjs(slot.End);
      return sessionStart.isSameOrAfter(slotStart) && sessionEnd.isSameOrBefore(slotEnd);
    });
    if (!validSlot) {
      showSnack("Session time is outside the coach's availability window!", "error");
      return;
    }
    try {
      await axios.put(`/booking/sessions/${selectedSession.SessionID}`, {
        SessionName: selectedSession.SessionName,
        BranchID: selectedSession.BranchID,
        SessionType: selectedSession.SessionType,
        CoachID: selectedSession.CoachID,
        StartTime: selectedSession.StartTime,
        EndTime: selectedSession.EndTime,
        Capacity: selectedSession.Capacity,
        Location: selectedSession.Location,
        Fee: selectedSession.Fee,
        Status: selectedSession.Status || "Scheduled",
      });
      setEditSessionModal(false);
      fetchAllData();
      showSnack("Session updated!", "success");
    } catch (err) {
      console.error("Failed to update session:", err);
      showSnack("Error updating session. Check console.", "error");
    }
  }

  // ---------- BOOK SESSION ----------
  function handleOpenBookSession(sessionId) {
    const found = sessions.find((s) => s.SessionID === sessionId);
    if (found) {
      setSessionToBook(found);
      setSessionBookingMemberID("");
      setSessionBookingDate(
        found.StartTime
          ? dayjs(found.StartTime).format("YYYY-MM-DD HH:mm")
          : dayjs().format("YYYY-MM-DD HH:mm")
      );
      setSessionBookingStatus("Pending");
      setBookSessionOpen(true);
    }
  }
  async function handleBookSessionConfirm() {
    if (!sessionToBook) return;
    try {
      await axios.post("/booking/sessions/book", {
        SessionID: sessionToBook.SessionID,
        MemberID: sessionBookingMemberID,
        BookingDate: dayjs(sessionBookingDate).format("YYYY-MM-DD"),
        Status: sessionBookingStatus
      });

      // Step 2: Notify the coach
      if (sessionToBook.CoachID) {
        const foundCoach = coaches.find((c) => c.CoachID === sessionToBook.CoachID);
        if (foundCoach && foundCoach.ContactInfo && foundCoach.Email?.includes("@")) {
          const foundMember = members.find((m) => m.MemberID === Number(sessionBookingMemberID));
          const memberName = foundMember ? foundMember.FullName : "Unknown Member";

          await axios.post("/notifications/notify-coach-booking-mailjet", {
            coach_id: foundCoach.CoachID,
            coach_name: foundCoach.FullName,
            coach_email: foundCoach.Email,
            member_name: memberName,
            session_name: sessionToBook.SessionName,
            start_time: sessionToBook.StartTime,
            end_time: sessionToBook.EndTime,
          });
        }
      }
      // Step 2b: Notify the member
      const foundMemberForNotification = members.find(
        (m) => m.MemberID === Number(sessionBookingMemberID)
      );
      if (
        foundMemberForNotification &&
        foundMemberForNotification.Email &&
        foundMemberForNotification.Email.includes("@")
      ) {
        await axios.post("/notifications/notify-member-booking-mailjet", {
          member_id: foundMemberForNotification.MemberID,
          member_name: foundMemberForNotification.FullName,
          member_email: foundMemberForNotification.Email,
          coach_name:
            coaches.find((c) => c.CoachID === sessionToBook.CoachID)?.FullName || "",
          session_name: sessionToBook.SessionName,
          start_time: dayjs(sessionToBook.StartTime).format("YYYY-MM-DD HH:mm:ss"),
          end_time: dayjs(sessionToBook.EndTime).format("YYYY-MM-DD HH:mm:ss"),
        });
      }

      setBookSessionOpen(false);
      fetchAllData();
      showSnack("Session booked successfully! Please create payment separately.", "success");
    } catch (err) {
      console.error("Failed to book session or notify coach:", err);
      if (err.response && err.response.status === 422) {
        showSnack(err.response.data.message || "Capacity reached!", "warning");
      } else {
        showSnack("Error booking session. Check console for details.", "error");
      }
    }
  }

  // ---------- COACHES ----------
  const handleViewCoach = (coachId) => {
    const found = coaches.find((c) => c.CoachID === coachId);
    if (found) {
      setSelectedCoach(found);
      setViewCoachModal(true);
    }
  };
  const handleEditCoach = (coachId) => {
    const found = coaches.find((c) => c.CoachID === coachId);
    if (found) {
      setSelectedCoach(found);
      setEditCoachModal(true);
    }
  };
  const handleDeleteCoach = async (coachId) => {
    try {
      await axios.delete(`/coaches/${coachId}`);
      setCoaches((prev) => prev.filter((c) => c.CoachID !== coachId));
      showSnack("Coach deleted!", "success");
    } catch (err) {
      console.error("Failed to delete coach:", err);
      showSnack("Error deleting coach. Check console.", "error");
    }
  };
  const handleCreateCoach = async () => {
    try {
      await axios.post("/coaches", {
        FullName: newCoach.FullName,
        Specialty: newCoach.Specialty,
        ContactInfo: newCoach.ContactInfo,
        Email: newCoach.Email,
      });
      setAddCoachOpen(false);
      fetchAllData();
      showSnack("Coach created!", "success");
    } catch (err) {
      console.error("Failed to create coach:", err);
      showSnack("Error creating coach. Check console.", "error");
    }
  };
  const handleUpdateCoach = async () => {
    if (!selectedCoach) return;
    try {
      await axios.put(`/coaches/${selectedCoach.CoachID}`, {
        FullName: selectedCoach.FullName,
        Specialty: selectedCoach.Specialty,
        ContactInfo: selectedCoach.ContactInfo,
        Email: newCoach.Email,
      });
      setEditCoachModal(false);
      fetchAllData();
      showSnack("Coach updated!", "success");
    } catch (err) {
      console.error("Failed to update coach:", err);
      showSnack("Error updating coach. Check console.", "error");
    }
  };

  // Delete Confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState("");
  const [deleteItemId, setDeleteItemId] = useState(null);

  const handleOpenDeleteDialog = (type, id) => {
    setDeleteType(type);
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  };
  const handleConfirmDelete = async () => {
    try {
      if (deleteType === "booking") {
        await handleDeleteBooking(deleteItemId);
      } else if (deleteType === "session") {
        await axios.delete(`/booking/sessions/${deleteItemId}`);
        setSessions((prev) => prev.filter((s) => s.SessionID !== deleteItemId));
        setCalendarEvents((prev) =>
          prev.filter((ev) => ev.id !== `session-${deleteItemId}`)
        );
        showSnack("Session deleted!", "success");
      } else if (deleteType === "coach") {
        await handleDeleteCoach(deleteItemId);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
    setDeleteDialogOpen(false);
  };

  // Columns
  const bookingColumns = [
    { field: "BookingID", headerName: "ID", width: 80 },
    { field: "Branch", headerName: "Branch", width: 180 },
    { field: "MemberName", headerName: "Member Name", width: 150 },
    { field: "FacilityName", headerName: "Facility", width: 130 },
    {
      field: "BookingDate",
      headerName: "Date",
      width: 180,
      renderCell: (params) => (params.value ? formatDate(params.value) : "—"),
    },
    {
      field: "BookingTime",
      headerName: "Time",
      width: 80,
      renderCell: (params) => (params.value ? formatTime(params.value) : "—"),
    },
    { field: "Duration", headerName: "Hrs", width: 70 },
    { field: "Status", headerName: "Status", width: 100 },
    {
      field: "Actions",
      headerName: "Actions",
      width: 280,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              color="success"
              onClick={() => handleViewBooking(params.row.BookingID)}
            >
              <VisibilityIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleEditBooking(params.row.BookingID)}
            >
              <EditIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              variant="contained"
              color="error"
              onClick={() => handleOpenDeleteDialog("booking", params.row.BookingID)}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const sessionColumns = [
    { field: "SessionID", headerName: "ID", width: 80 },
    { field: "Branch", headerName: "Branch", width: 150 },
    { field: "SessionName", headerName: "Session Name", width: 180 },
    { field: "CoachName", headerName: "Coach", width: 130 },
    {
      field: "StartTime",
      headerName: "Start",
      width: 200,
      renderCell: (params) => formatDateTime(params.value),
    },
    {
      field: "EndTime",
      headerName: "End",
      width: 200,
      renderCell: (params) => formatDateTime(params.value),
    },
    { field: "Capacity", headerName: "Capacity", width: 70 },
    {
      field: "Actions",
      headerName: "Actions",
      width: 450,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              color="success"
              onClick={() => handleViewSession(params.row.SessionID)}
            >
              <VisibilityIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleEditSession(params.row.SessionID)}
            >
              <EditIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Book Member">
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleOpenBookSession(params.row.SessionID)}
            >
              <EventAvailableIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Delete Session">
            <Button
              variant="contained"
              color="error"
              onClick={() => handleOpenDeleteDialog("session", params.row.SessionID)}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const coachesColumns = [
    { field: "CoachID", headerName: "ID", width: 80 },
    { field: "FullName", headerName: "Name", width: 150 },
    { field: "Specialty", headerName: "Specialty", width: 130 },
    { field: "ContactInfo", headerName: "Contact Info", width: 150 },
    {
      field: "Actions",
      headerName: "Actions",
      width: 410,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              color="success"
              onClick={() => handleViewCoach(params.row.CoachID)}
            >
              <VisibilityIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleEditCoach(params.row.CoachID)}
            >
              <EditIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Manage Availability">
            <Button
              variant="contained"
              color="secondary"
              onClick={() => openManageAvailability(params.row.CoachID)}
            >
              <ScheduleIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              variant="contained"
              color="error"
              onClick={() => handleOpenDeleteDialog("coach", params.row.CoachID)}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Generate Timeslots">
            <Button
              variant="contained"
              color="info"
              onClick={() => handleGenerateTimeslotsClick(params.row.CoachID)}
            >
              Timeslots
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const columns =
    activeTab === 0
      ? bookingColumns
      : activeTab === 1
      ? sessionColumns
      : coachesColumns;

  let rows = [];
  if (activeTab === 0) rows = filteredBookings;
  else if (activeTab === 1) rows = filteredSessions;
  else rows = filteredCoaches;

  const getRowId = (row) =>
    activeTab === 0 ? row.BookingID : activeTab === 1 ? row.SessionID : row.CoachID;

  // Export
  const handleExportClick = (e) => setExportAnchor(e.currentTarget);
  const handleExportClose = () => setExportAnchor(null);

  const csvHeadersBookings = [
    { label: "Booking ID", key: "BookingID" },
    { label: "Branch", key: "Branch" },
    { label: "Member Name", key: "MemberName" },
    { label: "Facility", key: "FacilityName" },
    { label: "Date", key: "BookingDate" },
    { label: "Time", key: "BookingTime" },
    { label: "Duration", key: "Duration" },
    { label: "Status", key: "Status" },
  ];
  const csvHeadersSessions = [
    { label: "Session ID", key: "SessionID" },
    { label: "Session Name", key: "SessionName" },
    { label: "Coach Name", key: "CoachName" },
    { label: "Start Time", key: "StartTime" },
    { label: "End Time", key: "EndTime" },
    { label: "Capacity", key: "Capacity" },
    { label: "Participants", key: "Participants" },
    { label: "Status", key: "Status" },
  ];

  const handleExportPDF = () => {
    handleExportClose();
    let title = "";
    let filename = "";
    let tableHeaders = [];
    let tableBody = [];

    if (activeTab === 0) {
      title = "Facility Bookings Report";
      filename = "BookingsReport.pdf";
      tableHeaders = ["Booking ID", "Branch", "Member Name", "Facility", "Date", "Time", "Duration", "Status"];
      tableBody = filteredBookings.map((b) => [
        b.BookingID || "N/A",
        b.Branch || "—",
        b.MemberName || "N/A",
        b.FacilityName || "N/A",
        formatDate(b.BookingDate),
        b.BookingTime ? formatTime(b.BookingTime) : "—",
        b.Duration || "—",
        b.Status || "—",
      ]);
    } else if (activeTab === 1) {
      title = "Coach Sessions Report";
      filename = "SessionsReport.pdf";
      tableHeaders = ["Session ID", "Branch", "Session Name", "Coach Name", "Start", "End", "Capacity"];
      tableBody = filteredSessions.map((s) => [
        s.SessionID || "N/A",
        s.Branch || "—",
        s.SessionName || "N/A",
        s.CoachName || "—",
        formatDateTime(s.StartTime),
        formatDateTime(s.EndTime),
        s.Capacity || "—",
      ]);
    } else {
      title = "Coaches Report";
      filename = "CoachesReport.pdf";
      tableHeaders = ["Coach ID", "Full Name", "Specialty", "Availability", "Contact Info"];
      tableBody = filteredCoaches.map((c) => [
        c.CoachID || "N/A",
        c.FullName || "—",
        c.Specialty || "—",
        c.Availability || "—",
        c.ContactInfo || "—",
      ]);
    }

    if (tableBody.length === 0) {
      alert("No records to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const coverPageImg = "/imgs/coverpage2.png";

    doc.addImage(coverPageImg, "PNG", 0, 0, pageWidth, pageHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor("#ffffff");
    doc.text(title, pageWidth / 2, 100, { align: "center" });
    doc.setFontSize(14);
    doc.text(
      "Generated on: " + new Date().toLocaleDateString(),
      pageWidth / 2,
      130,
      { align: "center" }
    );

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 100,
      theme: "striped",
      headStyles: {
        fillColor: "#050505",
        textColor: "#ffffff",
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        textColor: "#333333",
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: "#f0f4f7",
      },
      styles: {
        overflow: "linebreak",
        cellPadding: 5,
        halign: "center",
        valign: "middle",
      },
      margin: { top: 50, left: 20, right: 20, bottom: 20 },
    });

    doc.save(filename);
  };

  // ---------- CALENDAR PAGINATION ----------
  const eventsPerPage = 6;
  const [eventPage, setEventPage] = useState(1);
  const indexOfLastEvent = eventPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = calendarEvents.slice(indexOfFirstEvent, indexOfLastEvent);

  function handleEventPageChange(e, value) {
    setEventPage(value);
  }

  const calendarStyle = {
    height: 730,
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.background.default
        : "#fff",
    color: theme.palette.text.primary,
    borderRadius: 4,
  };

  // ---------- COACH AVAILABILITIES ----------
  const [manageAvailOpen, setManageAvailOpen] = useState(false);
  const [coachToManage, setCoachToManage] = useState(null);

  async function openManageAvailability(coachId) {
    try {
      const res = await axios.get(`/coaches/${coachId}?include=availabilities`);
      setCoachToManage(res.data.coach);
      setManageAvailOpen(true);
    } catch (err) {
      console.error("Error fetching coach + availabilities", err);
      alert("Failed to fetch coach. See console.");
    }
  }
  function closeManageAvailability() {
    setManageAvailOpen(false);
    setCoachToManage(null);
    // optionally fetchAllData again if needed
  }

  const [coachAvailability, setCoachAvailability] = useState([]);
  const [selectedTimeslotId, setSelectedTimeslotId] = useState("");

  function handleCoachChange(newValue) {
    setNewSession({
      ...newSession,
      CoachID: newValue?.CoachID ?? "",
    });
    if (newValue?.availabilities) {
      setCoachAvailability(newValue.availabilities);
    } else {
      setCoachAvailability([]);
    }
    setSelectedTimeslotId("");
  }
  function handleTimeslotSelect(slotId) {
    setSelectedTimeslotId(slotId);
    const slot = coachAvailability.find((s) => s.id === slotId);
    if (!slot) return;
    setNewSession({
      ...newSession,
      StartTime: dayjs(slot.Start).format("YYYY-MM-DD HH:mm:ss"),
      EndTime: dayjs(slot.End).format("YYYY-MM-DD HH:mm:ss"),
    });
  }
  function timeslotLabel(slot) {
    const startFmt = dayjs(slot.Start).format("MMM D, h:mm A");
    const endFmt = dayjs(slot.End).format("MMM D, h:mm A");
    return `${startFmt} – ${endFmt}`;
  }

  function handleGenerateTimeslotsClick(coachId) {
    setGenerateForm({
      coachId: coachId,
      startDate: dayjs().format("YYYY-MM-DD"),
      endDate: dayjs().add(7, "day").format("YYYY-MM-DD"),
      branchId: "",
      location: "",
      sessionType: "Regular",
      fee: 0,
    });
    setGenerateModalOpen(true);
  }
  async function generateTimeslots() {
    if (!generateForm.coachId) {
      showSnack("No coach selected!", "error");
      return;
    }
    try {
      const payload = {
        start_date: generateForm.startDate,
        end_date: generateForm.endDate,
        branch_id: generateForm.branchId,
        location: generateForm.location,
        session_type: generateForm.sessionType,
        fee: Number(generateForm.fee),
      };
      await axios.post(`/coaches/${generateForm.coachId}/generate-timeslots`, payload);
      showSnack("Timeslots generated successfully!", "success");
      setGenerateModalOpen(false);
      fetchAllData();
    } catch (err) {
      console.error("Error generating timeslots:", err);
      showSnack("Failed to generate timeslots. Check console.", "error");
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: isSmall ? 2 : 4 }}>
        {/* CALENDAR & EVENT LIST */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ minHeight: 763 }}>
              <CardHeader title="Calendar" />
              <CardContent>
                <BigCalendarWrapper>
                  <DnDCalendar
                    localizer={localizer}
                    events={bigCalendarEvents}
                    defaultView="month"
                    style={calendarStyle}
                    selectable
                    defaultDate={new Date()}
                    onSelectSlot={(slotInfo) => {
                      if (new Date(slotInfo.start) < new Date()) return;
                      handleDateClick({ dateStr: slotInfo.start.toISOString() });
                    }}
                    onEventDrop={({ event, start, end }) =>
                      handleEventDrop({
                        event: { id: event.id, startStr: start.toISOString() },
                      })
                    }
                  />
                </BigCalendarWrapper>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Drag events to reschedule; cannot schedule on past dates.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ minHeight: 763 }}>
              <CardHeader title="Event List" />
              <CardContent sx={{ pt: 0 }}>
                <Divider sx={{ mb: 2 }} />
                {calendarEvents.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No events found.
                  </Typography>
                )}
                <List dense sx={{ maxHeight: 650, overflowY: "auto" }}>
                  {currentEvents.map((ev) => (
                    <Paper
                      key={ev.id}
                      variant="outlined"
                      sx={{ mb: 1, p: 1, borderRadius: 2 }}
                    >
                      <ListItemText
                        primary={ev.title}
                        primaryTypographyProps={{ fontWeight: 500 }}
                        secondary={
                          ev.type === "session"
                            ? `Date: ${formatDate(ev.start)}`
                            : `Date: ${formatDate(ev.date)}`
                        }
                      />
                    </Paper>
                  ))}
                </List>
              </CardContent>
              {calendarEvents.length > eventsPerPage && (
                <CardActions>
                  <Pagination
                    count={Math.ceil(calendarEvents.length / eventsPerPage)}
                    page={eventPage}
                    onChange={handleEventPageChange}
                    size="small"
                    sx={{ mx: "auto" }}
                  />
                </CardActions>
              )}
            </Card>
          </Grid>
        </Grid>

        {/* TABS */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h4">Bookings & Sessions</Typography>
          <Tabs
            value={activeTab}
            onChange={(e, val) => {
              setActiveTab(val);
              setSearchTerm("");
            }}
          >
            <Tab icon={<CalendarTodayIcon />} label="Facility Bookings" />
            <Tab icon={<FitnessCenterIcon />} label="Coach Sessions" />
            <Tab icon={<GroupsIcon />} label="Coaches" />
          </Tabs>
        </Box>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: isSmall ? "column" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                select
                label="Branch"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                size="small"
                sx={{ width: 150 }}
              >
                <MenuItem value="all">All</MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.value} value={String(b.value)}>
                    {b.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                placeholder="Search"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: 350 }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={handleExportClick}
                startIcon={<FileDownloadIcon />}
                sx={{ textTransform: "none" }}
              >
                Export
              </Button>
              <Menu
                anchorEl={exportAnchor}
                open={openExport}
                onClose={handleExportClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              >
                <MenuItem>
                  {activeTab === 0 ? (
                    <CSVLink
                      data={filteredBookings}
                      headers={csvHeadersBookings}
                      filename="Bookings.csv"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <Typography>Export CSV</Typography>
                    </CSVLink>
                  ) : (
                    <CSVLink
                      data={filteredSessions}
                      headers={csvHeadersSessions}
                      filename="Sessions.csv"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <Typography>Export CSV</Typography>
                    </CSVLink>
                  )}
                </MenuItem>
                <MenuItem onClick={handleExportPDF}>
                  <Typography>Export PDF</Typography>
                </MenuItem>
              </Menu>

              {activeTab === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddBookingOpen(true)}
                >
                  Add Facility Booking
                </Button>
              )}
              {activeTab === 1 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddSessionOpen(true)}
                >
                  Add Session
                </Button>
              )}
              {activeTab === 2 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddCoachOpen(true)}
                >
                  Add Coach
                </Button>
              )}
            </Box>
          </Box>

          <Box style={{ height: 500, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5, 10]}
              getRowId={getRowId}
            />
          </Box>
        </Paper>

        {/* MANAGE AVAILABILITY DIALOG */}
        <ManageAvailabilityDialog
          open={manageAvailOpen}
          onClose={closeManageAvailability}
          coach={coachToManage}
          onSave={() => {
            // optional callback to refresh
            fetchAllData();
          }}
        />

          {/* ADD BOOKING DIALOG */}
<Dialog
  open={isAddBookingOpen}
  onClose={() => setAddBookingOpen(false)}
  fullWidth
  maxWidth="lg"
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
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CalendarTodayIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Add New Booking
        </Typography>
      </Box>
      <IconButton onClick={() => setAddBookingOpen(false)} sx={{ "&:hover": { color: "error.main" } }}>
        <CloseIcon />
      </IconButton>
    </Box>
  </DialogTitle>

  <DialogContent dividers sx={{ p: 3 }}>
    <Grid container spacing={2}>
      {/* 1) "Booking For" Radio Group: "Member" vs. "Guest" */}
      <Grid item xs={12}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Booking For</FormLabel>
          <RadioGroup
            row
            value={newBooking.bookingType}
            onChange={(e) =>
              setNewBooking((prev) => ({
                ...prev,
                bookingType: e.target.value,
                // Reset certain fields if the user switches mid-way
                MemberID: e.target.value === "member" ? "" : null,
                GuestName: e.target.value === "guest" ? "" : "",
                GuestEmail: e.target.value === "guest" ? "" : "",
              }))
            }
          >
            <FormControlLabel
              value="member"
              control={<Radio />}
              label="Existing Member"
            />
            <FormControlLabel
              value="guest"
              control={<Radio />}
              label="Guest"
            />
          </RadioGroup>
        </FormControl>
      </Grid>

      {/* 2) Conditionally show Member Autocomplete OR Guest fields */}
      {newBooking.bookingType === "member" ? (
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={members}
            getOptionLabel={(option) => option.FullName || ""}
            value={
              members.find((m) => m.MemberID === newBooking.MemberID) || null
            }
            onChange={(event, newValue) =>
              setNewBooking((prev) => ({
                ...prev,
                MemberID: newValue ? newValue.MemberID : "",
              }))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Member"
                required
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
        </Grid>
      ) : (
        <>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Guest Name"
              fullWidth
              required
              value={newBooking.GuestName}
              onChange={(e) =>
                setNewBooking({ ...newBooking, GuestName: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Guest Email"
              type="email"
              fullWidth
              required
              value={newBooking.GuestEmail}
              onChange={(e) =>
                setNewBooking({ ...newBooking, GuestEmail: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </>
      )}

      {/* 3) Branch */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth size="medium">
          <InputLabel>Branch</InputLabel>
          <Select
            name="BranchID"
            value={newBooking.BranchID}
            onChange={(e) => setNewBooking({ ...newBooking, BranchID: e.target.value })}
            startAdornment={
              <InputAdornment position="start">
                <BusinessIcon />
              </InputAdornment>
            }
          >
            <MenuItem value="">-- Select Branch --</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.value} value={String(b.value)}>
                {b.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 4) Facility */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth size="medium">
          <InputLabel>Facility</InputLabel>
          <Select
            name="FacilityID"
            value={newBooking.FacilityID}
            onChange={(e) =>
              setNewBooking({ ...newBooking, FacilityID: e.target.value })
            }
            startAdornment={
              <InputAdornment position="start">
                <FitnessCenterIcon />
              </InputAdornment>
            }
          >
            <MenuItem value="">-- Select Facility --</MenuItem>
            {(newBooking.BranchID
              ? facilities.filter(
                  (f) => String(f.BranchID) === newBooking.BranchID
                )
              : facilities
            ).map((f) => (
              <MenuItem key={f.FacilityID} value={f.FacilityID}>
                {f.FacilityName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 5) Booking Date */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Booking Date"
          type="date"
          fullWidth
          required
          value={newBooking.BookingDate || ""}
          onChange={(e) =>
            setNewBooking({ ...newBooking, BookingDate: e.target.value })
          }
          InputLabelProps={{ shrink: true }}
          // If you're using dayjs, you can do: min: dayjs().format("YYYY-MM-DD")
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EventIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>

      {/* 6) Booking Time */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Booking Time"
          type="time"
          fullWidth
          required
          value={newBooking.BookingTime || ""}
          onChange={(e) =>
            setNewBooking({ ...newBooking, BookingTime: e.target.value })
          }
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AccessTimeIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>

      {/* 7) Duration */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Duration (hrs)"
          type="number"
          fullWidth
          required
          value={newBooking.Duration || ""}
          onChange={(e) =>
            setNewBooking({ ...newBooking, Duration: e.target.value })
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <HourglassBottomIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>

      {/* 8) Status */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Status"
          fullWidth
          value={newBooking.Status || "Pending"}
          onChange={(e) => setNewBooking({ ...newBooking, Status: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <InfoIcon />
              </InputAdornment>
            ),
          }}
        />
      </Grid>

      {/* 9) Payment Method */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Payment Method</InputLabel>
          <Select
            label="Payment Method"
            value={newBooking.PaymentMethod || "Cash"}
            onChange={(e) =>
              setNewBooking({ ...newBooking, PaymentMethod: e.target.value })
            }
            startAdornment={
              <InputAdornment position="start">
                <PaymentIcon />
              </InputAdornment>
            }
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="GCash">GCash</MenuItem>
            <MenuItem value="BPI">BPI</MenuItem>
            <MenuItem value="BDO">BDO</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 10) Payment Amount */}
      <Grid item xs={12} sm={6}>
        <TextField
          label="Payment Amount"
          type="number"
          fullWidth
          required
          value={newBooking.PaymentAmount || ""}
          onChange={(e) =>
            setNewBooking({ ...newBooking, PaymentAmount: e.target.value })
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Typography variant="body1">₱</Typography>
              </InputAdornment>
            ),
          }}
        />
      </Grid>

      {/* Payment method fields removed */}
      <Grid item xs={12}>
        <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic', mt: 1 }}>
          Note: After saving the booking, please create payment separately using the Payments interface.
        </Typography>
      </Grid>
      
    </Grid>
  </DialogContent>

  <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
    <Button
      variant="contained"
      color="primary"
      onClick={() => {
        setDialogType("booking");
        setOpenConfirmation(true);
      }}
      sx={{ textTransform: "none" }}
      disabled={!isSubmitEnabledBooking}
    >
      <SaveIcon sx={{ mr: 1 }} /> Save Booking
    </Button>
  </DialogActions>
</Dialog>


              
        {/* ADD SESSION DIALOG */}
        <Dialog
      open={isAddSessionOpen}
      onClose={() => setAddSessionOpen(false)}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            <EventIcon sx={{ verticalAlign: "middle", mr: 1 }} />
            Add New Session
          </Typography>
          <IconButton
            onClick={() => setAddSessionOpen(false)}
            sx={{ color: "inherit", "&:hover": { color: "red" } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ p: 2 }}>
          <Divider sx={{ mb: 3 }} />
          <form onSubmit={(e) => e.preventDefault()}>
            <Grid container spacing={2}>
              {/* Branch */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Branch</InputLabel>
                  <Select
                    name="BranchID"
                    value={newSession.BranchID || ""}
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        BranchID: e.target.value,
                      })
                    }
                    input={
                      <OutlinedInput
                        label="Branch"
                        startAdornment={
                          <InputAdornment position="start">
                            <BusinessIcon />
                          </InputAdornment>
                        }
                      />
                    }
                  >
                    {branches.map((b) => (
                      <MenuItem key={b.value} value={String(b.value)}>
                        {b.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* SessionName */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Session Name"
                  name="SessionName"
                  fullWidth
                  required
                  value={newSession.SessionName}
                  onChange={(e) =>
                    setNewSession({ ...newSession, SessionName: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EventIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* SessionType */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Session Type"
                  name="SessionType"
                  fullWidth
                  required
                  value={newSession.SessionType}
                  onChange={(e) =>
                    setNewSession({ ...newSession, SessionType: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CategoryIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Coach Picker */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={coaches}
                  getOptionLabel={(option) => option.FullName || ""}
                  value={coaches.find((c) => c.CoachID === newSession.CoachID) || null}
                  onChange={(event, newValue) => handleCoachChange(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Coach"
                      fullWidth
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <PersonIcon />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Timeslot Picker */}
              {coachAvailability.length > 0 && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Pick an Availability Slot</InputLabel>
                    <Select
                      label="Pick an Availability Slot"
                      value={selectedTimeslotId}
                      onChange={(e) => handleTimeslotSelect(e.target.value)}
                    >
                      {coachAvailability.map((slot) => (
                        <MenuItem key={slot.id} value={slot.id}>
                          {timeslotLabel(slot)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* StartTime & EndTime pickers, optionally read-only */}
              <Grid item xs={12} sm={6}>
                <DesktopDateTimePicker
                  label="Start Date & Time"
                  value={newSession.StartTime ? dayjs(newSession.StartTime) : null}
                  onChange={(newValue) => {
                    // If you still allow manual overrides, handle it here
                    if (newValue && newValue.isValid()) {
                      setNewSession({
                        ...newSession,
                        StartTime: newValue.format("YYYY-MM-DD HH:mm:ss"),
                      });
                    }
                  }}
                  format="YYYY-MM-DD HH:mm"
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                  minDateTime={dayjs()}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DesktopDateTimePicker
                  label="End Date & Time"
                  value={newSession.EndTime ? dayjs(newSession.EndTime) : null}
                  onChange={(newValue) => {
                    // If you still allow manual overrides
                    if (newValue && newValue.isValid()) {
                      setNewSession({
                        ...newSession,
                        EndTime: newValue.format("YYYY-MM-DD HH:mm:ss"),
                      });
                    }
                  }}
                  format="YYYY-MM-DD HH:mm"
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                  minDateTime={
                    newSession.StartTime
                      ? dayjs(newSession.StartTime)
                      : dayjs()
                  }
                />
              </Grid>

              {/* Capacity */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Capacity"
                  name="Capacity"
                  type="number"
                  fullWidth
                  required
                  value={newSession.Capacity}
                  onChange={(e) =>
                    setNewSession({ ...newSession, Capacity: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <GroupsIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Location */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Location"
                  name="Location"
                  fullWidth
                  required
                  value={newSession.Location}
                  onChange={(e) =>
                    setNewSession({ ...newSession, Location: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Fee */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fee"
                  name="Fee"
                  type="number"
                  fullWidth
                  value={newSession.Fee}
                  onChange={(e) =>
                    setNewSession({ ...newSession, Fee: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PaymentIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 4,
                display: "flex",
                flexDirection: "row",
                gap: 3,
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setDialogType("session");
                  setOpenConfirmation(true);
                }}
                disabled={!isSubmitEnabledSession}
              >
                <SaveIcon /> Save Session
              </Button>
            </Box>
          </form>
        </Box>
      </DialogContent>
    </Dialog>

        {/* VIEW BOOKING DIALOG */}
        <Dialog
          open={viewBookingModal}
          onClose={() => setViewBookingModal(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Booking Details</Typography>
              <IconButton onClick={() => setViewBookingModal(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedBooking && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Booking ID"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedBooking.BookingID || "—"}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Branch"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedBooking.Branch || "—"}
                  />
                </Grid>

                {/* WHO BOOKED? If MemberID is present, show MemberName; otherwise Guest */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Booked By"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={
                      selectedBooking.MemberID
                        ? selectedBooking.MemberName
                        : selectedBooking.GuestName
                    }
                  />
                </Grid>
                {!selectedBooking.MemberID && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Guest Email"
                      variant="filled"
                      InputProps={{ readOnly: true }}
                      value={selectedBooking.GuestEmail || "—"}
                    />
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Facility"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedBooking.FacilityName || "—"}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Date"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedBooking.BookingDate || "—"}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Time"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedBooking.BookingTime || "—"}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Duration (hrs)"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedBooking.Duration || "—"}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Status"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedBooking.Status || "—"}
                  />
                </Grid>

                {/* Payment info, if you store it */}
              </Grid>
            )}
          </DialogContent>
        </Dialog>

        {/* EDIT BOOKING DIALOG */}
      <Dialog
        open={editBookingModal}
        onClose={() => setEditBookingModal(false)}
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
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6">Edit Booking</Typography>
            <IconButton onClick={() => setEditBookingModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* MEMBER vs. GUEST */}
              <FormControl component="fieldset">
                <FormLabel>Booking For</FormLabel>
                <RadioGroup
                  row
                  value={selectedBooking.bookingType || "member"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedBooking((prev) => ({
                      ...prev,
                      bookingType: val,
                      // If switching to "member", blank out guest fields
                      // If switching to "guest", blank out member fields
                      MemberID:   val === "member" ? "" : null,
                      GuestName:  val === "guest"  ? "" : "",
                      GuestEmail: val === "guest"  ? "" : "",
                    }));
                  }}
                >
                  <FormControlLabel value="member" control={<Radio />} label="Member" />
                  <FormControlLabel value="guest"  control={<Radio />} label="Guest"  />
                </RadioGroup>
              </FormControl>

              {/* If bookingType=member, show Autocomplete; else show Guest fields */}
              {selectedBooking.bookingType === "member" ? (
                <Autocomplete
                  options={members}
                  getOptionLabel={(option) => option.FullName || ""}
                  value={
                    members.find((m) => m.MemberID === selectedBooking.MemberID) || null
                  }
                  onChange={(e, val) => {
                    setSelectedBooking((prev) => ({
                      ...prev,
                      MemberID: val ? val.MemberID : "",
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Member" size="small" fullWidth />
                  )}
                />
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Guest Name"
                      size="small"
                      fullWidth
                      value={selectedBooking.GuestName || ""}
                      onChange={(e) =>
                        setSelectedBooking((prev) => ({ ...prev, GuestName: e.target.value }))
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Guest Email"
                      type="email"
                      size="small"
                      fullWidth
                      value={selectedBooking.GuestEmail || ""}
                      onChange={(e) =>
                        setSelectedBooking((prev) => ({ ...prev, GuestEmail: e.target.value }))
                      }
                    />
                  </Grid>
                </Grid>
              )}

              {/* Facility ID */}
              <TextField
                label="Facility ID"
                size="small"
                fullWidth
                value={selectedBooking.FacilityID || ""}
                onChange={(e) =>
                  setSelectedBooking((prev) => ({ ...prev, FacilityID: e.target.value }))
                }
              />

              {/* Booking Date */}
              <TextField
                label="Booking Date"
                type="date"
                size="small"
                fullWidth
                value={selectedBooking.BookingDate || ""}
                onChange={(e) =>
                  setSelectedBooking((prev) => ({ ...prev, BookingDate: e.target.value }))
                }
              />

              {/* Booking Time */}
              <TextField
                label="Booking Time"
                type="time"
                size="small"
                fullWidth
                value={selectedBooking.BookingTime || ""}
                onChange={(e) =>
                  setSelectedBooking((prev) => ({ ...prev, BookingTime: e.target.value }))
                }
              />

              {/* Duration */}
              <TextField
                label="Duration (hrs)"
                type="number"
                size="small"
                fullWidth
                value={selectedBooking.Duration || ""}
                onChange={(e) =>
                  setSelectedBooking((prev) => ({ ...prev, Duration: e.target.value }))
                }
              />

              {/* Payment Method */}
              <FormControl size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={selectedBooking.PaymentMethod || "Cash"}
                  onChange={(e) =>
                    setSelectedBooking((prev) => ({ ...prev, PaymentMethod: e.target.value }))
                  }
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="GCash">GCash</MenuItem>
                  <MenuItem value="BPI">BPI</MenuItem>
                  <MenuItem value="BDO">BDO</MenuItem>
                </Select>
              </FormControl>

              {/* Payment Amount */}
              <TextField
                label="Payment Amount"
                type="number"
                size="small"
                value={selectedBooking.PaymentAmount || ""}
                onChange={(e) =>
                  setSelectedBooking((prev) => ({ ...prev, PaymentAmount: e.target.value }))
                }
              />

              {/* Payment Note */}
              <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic', mt: 1 }}>
                Note: You can edit booking details here, but to update payment information, please use the Payments interface.
              </Typography>

              {/* Status */}
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={selectedBooking.Status || "Confirmed"}
                  onChange={(e) =>
                    setSelectedBooking((prev) => ({ ...prev, Status: e.target.value }))
                  }
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditBookingModal(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleUpdateBooking}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

        {/* EDIT SESSION DIALOG */}
        <Dialog
          open={editSessionModal}
          onClose={() => setEditSessionModal(false)}
          fullWidth
          maxWidth="md"
          sx={{
            "& .MuiDialog-paper": {
              borderRadius: 3,
              boxShadow: 6,
              p: 3,
              overflow: "hidden",
            },
          }}
        >
          <DialogTitle
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EditIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Edit Session
              </Typography>
            </Box>
            <IconButton
              onClick={() => setEditSessionModal(false)}
              sx={{
                color: "gray",
                "&:hover": { color: "red" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            {selectedSession && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Branch"
                    fullWidth
                    value={selectedSession.Branch || ""}
                    onChange={(e) =>
                      setSelectedSession({ ...selectedSession, Branch: e.target.value })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StoreIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Session Name"
                    fullWidth
                    value={selectedSession.SessionName || ""}
                    onChange={(e) =>
                      setSelectedSession({
                        ...selectedSession,
                        SessionName: e.target.value,
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FitnessCenterIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Session Type"
                    fullWidth
                    value={selectedSession.SessionType || ""}
                    onChange={(e) =>
                      setSelectedSession({
                        ...selectedSession,
                        SessionType: e.target.value,
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CategoryIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={coaches}
                    getOptionLabel={(option) => option.FullName || ""}
                    value={
                      coaches.find((c) => c.CoachID === selectedSession.CoachID) ||
                      null
                    }
                    onChange={(event, newValue) => {
                      if (newValue) {
                        setSelectedSession({
                          ...selectedSession,
                          CoachID: newValue.CoachID,
                          CoachName: newValue.FullName,
                        });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Coach"
                        fullWidth
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <PersonIcon />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DesktopDateTimePicker
                    label="Start Date & Time"
                    value={
                      selectedSession.StartTime
                        ? dayjs(selectedSession.StartTime, "YYYY-MM-DD HH:mm:ss")
                        : null
                    }
                    onChange={(newVal) => {
                      if (newVal && newVal.isValid()) {
                        setSelectedSession({
                          ...selectedSession,
                          StartTime: newVal.format("YYYY-MM-DD HH:mm:ss"),
                        });
                      }
                    }}
                    format="YYYY-MM-DD HH:mm"
                    slotProps={{
                      textField: (params) => (
                        <TextField
                          {...params}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccessTimeIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DesktopDateTimePicker
                    label="End Date & Time"
                    value={
                      selectedSession.EndTime
                        ? dayjs(selectedSession.EndTime, "YYYY-MM-DD HH:mm:ss")
                        : null
                    }
                    onChange={(newVal) => {
                      if (newVal && newVal.isValid()) {
                        setSelectedSession({
                          ...selectedSession,
                          EndTime: newVal.format("YYYY-MM-DD HH:mm:ss"),
                        });
                      }
                    }}
                    format="YYYY-MM-DD HH:mm"
                    slotProps={{
                      textField: (params) => (
                        <TextField
                          {...params}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <TimelapseIcon />
                              </InputAdornment>
                            ),
                          }}
                        />
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Capacity"
                    fullWidth
                    type="number"
                    value={selectedSession.Capacity || ""}
                    onChange={(e) =>
                      setSelectedSession({
                        ...selectedSession,
                        Capacity: e.target.value,
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <GroupIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Location"
                    fullWidth
                    value={selectedSession.Location || ""}
                    onChange={(e) =>
                      setSelectedSession({
                        ...selectedSession,
                        Location: e.target.value,
                      })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Fee"
                    fullWidth
                    type="number"
                    value={selectedSession.Fee || ""}
                    onChange={(e) =>
                      setSelectedSession({ ...selectedSession, Fee: e.target.value })
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MonetizationOnIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpdateSession}
              sx={{ textTransform: "none" }}
            >
              <SaveIcon sx={{ mr: 1 }} /> Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* VIEW SESSION DIALOG */}
        <Dialog
          open={viewSessionModal}
          onClose={() => setViewSessionModal(false)}
          fullWidth
          maxWidth="md"
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <VisibilityIcon sx={{ fontSize: 32, color: "primary.main" }} />
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  View Session
                </Typography>
              </Box>
              <IconButton
                onClick={() => setViewSessionModal(false)}
                sx={{
                  "&:hover": { color: "red" },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            {selectedSession && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Branch"
                    fullWidth
                    value={selectedSession.Branch || ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StoreIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Session Name"
                    fullWidth
                    value={selectedSession.SessionName || ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FitnessCenterIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Session Type"
                    fullWidth
                    value={selectedSession.SessionType || ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CategoryIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Coach"
                    fullWidth
                    value={selectedSession.CoachName || ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Start Date & Time"
                    fullWidth
                    value={formatDateTime(selectedSession.StartTime || "")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EventIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="End Date & Time"
                    fullWidth
                    value={formatDateTime(selectedSession.EndTime || "")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EventIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Capacity"
                    fullWidth
                    value={selectedSession.Capacity || ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <GroupIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Participants"
                    fullWidth
                    value={selectedSession.Participants || 0}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PeopleIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Location"
                    fullWidth
                    value={selectedSession.Location || ""}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Fee"
                    fullWidth
                    value={`₱${selectedSession.Fee || "0.00"}`}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MonetizationOnIcon />
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
        </Dialog>

        {/* BOOK SESSION DIALOG */}
        <Dialog
          open={isBookSessionOpen}
          onClose={() => setBookSessionOpen(false)}
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
            <Box
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <EventAvailableIcon sx={{ fontSize: 32, color: "primary.main" }} />
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Book a Session
                </Typography>
              </Box>
              <IconButton onClick={() => setBookSessionOpen(false)} sx={{ "&:hover": { color: "red" } }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            {sessionToBook && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography>
                    <strong>Session:</strong> {sessionToBook.SessionName}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    options={members}
                    getOptionLabel={(option) => option.FullName || ""}
                    value={
                      members.find((m) => m.MemberID === sessionBookingMemberID) ||
                      null
                    }
                    onChange={(event, newValue) =>
                      setSessionBookingMemberID(newValue ? newValue.MemberID : "")
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Select Member" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DesktopDateTimePicker
                    label="Booking Date & Time"
                    value={sessionBookingDate ? dayjs(sessionBookingDate) : null}
                    disabled
                    format="MMMM D, YYYY h:mm A"
                    slotProps={{
                      textField: (params) => (
                        <TextField
                          {...params}
                          fullWidth
                          value={
                            sessionBookingDate
                              ? formatDateTime(sessionBookingDate)
                              : "—"
                          }
                        />
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Booking Status</InputLabel>
                    <Select
                      value={sessionBookingStatus || ""}
                      onChange={(e) => setSessionBookingStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Payment note instead of payment fields */}
                <Grid item xs={12}>
                  <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic', mt: 1 }}>
                    Note: After saving the session booking, please create payment separately using the Payments interface.
                  </Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleBookSessionConfirm}
              sx={{ textTransform: "none" }}
            >
              <EventIcon sx={{ mr: 1 }} /> Confirm Booking
            </Button>
          </DialogActions>
        </Dialog>

        {/* ADD COACH DIALOG */}
        <Dialog
          open={isAddCoachOpen}
          onClose={() => setAddCoachOpen(false)}
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PersonIcon sx={{ fontSize: 32, color: "primary.main" }} />
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Add New Coach
                </Typography>
              </Box>
              <IconButton 
                onClick={() => setAddCoachOpen(false)}
                sx={{ "&:hover": { color: "error.main" } }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            <Grid container spacing={2}>
              {/* Full Name */}
              <Grid item xs={12}>
                <TextField
                  label="Full Name"
                  fullWidth
                  required
                  value={newCoach.FullName}
                  onChange={(e) => setNewCoach({ ...newCoach, FullName: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Specialty */}
              <Grid item xs={12}>
                <TextField
                  label="Specialty"
                  fullWidth
                  required
                  value={newCoach.Specialty}
                  onChange={(e) => setNewCoach({ ...newCoach, Specialty: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FitnessCenterIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Email */}
              <Grid item xs={12}>
                <TextField
                  label="Email Address"
                  type="email"
                  fullWidth
                  required
                  value={newCoach.Email || ""}
                  onChange={(e) => setNewCoach({ ...newCoach, Email: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Contact Info (Phone) */}
              <Grid item xs={12}>
                <TextField
                  label="Contact Info (Phone)"
                  fullWidth
                  required
                  value={newCoach.ContactInfo}
                  onChange={(e) => setNewCoach({ ...newCoach, ContactInfo: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setDialogType("coach");
                setOpenConfirmation(true);
              }}
              sx={{ textTransform: "none" }}
              disabled={!isSubmitEnabledCoach}
            >
              <SaveIcon sx={{ mr: 1 }} /> Save Coach
            </Button>
          </DialogActions>
        </Dialog>

        {/* VIEW COACH DIALOG */}
        <Dialog
          open={viewCoachModal}
          onClose={() => setViewCoachModal(false)}
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SportsIcon sx={{ fontSize: 32, color: "primary.main" }} />
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Coach Details
                </Typography>
              </Box>
              <IconButton
                onClick={() => setViewCoachModal(false)}
                sx={{ "&:hover": { color: theme.palette.error.main } }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 4 }}>
            {selectedCoach && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Coach ID"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedCoach.CoachID || "—"}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedCoach.FullName || "—"}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Specialty"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedCoach.Specialty || "—"}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedCoach.Email || "—"}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Contact Info"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedCoach.ContactInfo || "—"}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
        </Dialog>

        {/* EDIT COACH DIALOG */}
        <Dialog
          open={editCoachModal}
          onClose={() => setEditCoachModal(false)}
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ManageAccountsIcon sx={{ fontSize: 32, color: "primary.main" }} />
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Edit Coach
                </Typography>
              </Box>
              <IconButton
                onClick={() => setEditCoachModal(false)}
                sx={{ "&:hover": { color: theme.palette.error.main } }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 4 }}>
            {selectedCoach && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    size="small"
                    value={selectedCoach.FullName || ""}
                    onChange={(e) =>
                      setSelectedCoach({ ...selectedCoach, FullName: e.target.value })
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Specialty"
                    size="small"
                    value={selectedCoach.Specialty || ""}
                    onChange={(e) =>
                      setSelectedCoach({ ...selectedCoach, Specialty: e.target.value })
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    size="small"
                    value={selectedCoach.Email || ""}
                    onChange={(e) =>
                      setSelectedCoach({ ...selectedCoach, Email: e.target.value })
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Contact Info (Phone)"
                    size="small"
                    value={selectedCoach.ContactInfo || ""}
                    onChange={(e) =>
                      setSelectedCoach({ ...selectedCoach, ContactInfo: e.target.value })
                    }
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>

          <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpdateCoach}
              sx={{ textTransform: "none" }}
            >
              <SaveIcon sx={{ mr: 1 }} /> Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* EDIT CALENDAR EVENT DIALOG (Optional) */}
        <Dialog
          open={isEditEventOpen}
          onClose={() => setEditEventOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Edit Event</DialogTitle>
          <DialogContent dividers>
            {selectedEvent && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Title"
                  size="small"
                  value={selectedEvent.title}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, title: e.target.value })
                  }
                />
                <TextField
                  label="Date (YYYY-MM-DD)"
                  size="small"
                  value={selectedEvent.date}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, date: e.target.value })
                  }
                />
                <TextField
                  label="Description"
                  size="small"
                  value={selectedEvent.description || ""}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, description: e.target.value })
                  }
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditEventOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEditedEvent}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* DELETE CONFIRMATION DIALOG */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <DeleteForeverIcon sx={{ color: "error.main", fontSize: 28 }} />
              Confirm Deletion
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Typography>
              Are you sure you want to delete this record? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: "gray" }}>
              Cancel
            </Button>
            <Button variant="contained" color="error" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* CONFIRMATION DIALOG FOR ADD */}
        <Dialog
          open={openConfirmation}
          onClose={() => setOpenConfirmation(false)}
          PaperProps={{ sx: { borderRadius: 3, minWidth: 350 } }}
        >
          <DialogTitle sx={{ textAlign: "center", p: 3 }}>
            <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
              <CheckCircleOutlineIcon sx={{ fontSize: 50, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Confirm Submission
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="body1">
              {dialogType === "booking"
                ? "Are you sure you want to add this facility booking?"
                : dialogType === "session"
                ? "Are you sure you want to add this coach session?"
                : dialogType === "coach"
                ? "Are you sure you want to add this coach?"
                : ""}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", gap: 2, py: 2 }}>
            <Button
              onClick={() => setOpenConfirmation(false)}
              sx={{ textTransform: "none" }}
              style={{ color: "red" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              sx={{ textTransform: "none" }}
              onClick={async () => {
                if (dialogType === "booking") {
                  await handleCreateBooking();
                } else if (dialogType === "session") {
                  await handleCreateSession();
                } else if (dialogType === "coach") {
                  await handleCreateCoach();
                }
                setOpenConfirmation(false);
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Generate Timeslots Dialog */}
          <Dialog
            open={isGenerateModalOpen}
            onClose={() => setGenerateModalOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>
              Generate Timeslots for Coach
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" gutterBottom>
                Select date range, branch, location, etc., and we'll auto-create 1-hour
                sessions for each available slot within that range.
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Start Date"
                    type="date"
                    fullWidth
                    value={generateForm.startDate}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, startDate: e.target.value })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="End Date"
                    type="date"
                    fullWidth
                    value={generateForm.endDate}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, endDate: e.target.value })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Branch</InputLabel>
                    <Select
                      label="Branch"
                      value={generateForm.branchId}
                      onChange={(e) =>
                        setGenerateForm({ ...generateForm, branchId: e.target.value })
                      }
                    >
                      <MenuItem value="">-- Select Branch --</MenuItem>
                      {branches.map((b) => (
                        <MenuItem key={b.value} value={b.value}>
                          {b.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Location (Optional)"
                    fullWidth
                    value={generateForm.location}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, location: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Session Type"
                    fullWidth
                    value={generateForm.sessionType}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, sessionType: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Fee"
                    type="number"
                    fullWidth
                    value={generateForm.fee}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, fee: e.target.value })
                    }
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setGenerateModalOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={generateTimeslots}>
                Generate
              </Button>
            </DialogActions>
          </Dialog>

        {/* SNACKBAR MESSAGES */}
        <Snackbar
          open={snackOpen}
          autoHideDuration={3000}
          onClose={() => setSnackOpen(false)}
        >
          <Alert severity={snackSeverity} onClose={() => setSnackOpen(false)}>
            {snackMessage}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
