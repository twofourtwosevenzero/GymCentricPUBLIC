// File: StaffManagement.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Inertia } from '@inertiajs/inertia'; 
import { useTheme } from "@mui/material/styles";
import { route } from 'ziggy-js';
import {
  Box,
  Typography,
  Paper,
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
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Divider,
  Snackbar,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PeopleIcon from "@mui/icons-material/People";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PrintIcon from "@mui/icons-material/Print";
import ListAltIcon from "@mui/icons-material/ListAlt"; 
import DescriptionIcon from "@mui/icons-material/Description"; 
import AccessTimeIcon from "@mui/icons-material/AccessTime"; 
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong"; 
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn"; 
import EventIcon from "@mui/icons-material/Event";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from '@mui/icons-material/Save';

// Newly Added Icons from VIEW STAFF Dialog
import BadgeIcon from "@mui/icons-material/Badge";
import BusinessIcon from "@mui/icons-material/Business";
import NotesIcon from "@mui/icons-material/Notes";
import PersonIcon from "@mui/icons-material/Person";

import { DataGrid } from "@mui/x-data-grid";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Import external layout components
import AddNewStaffLayout from "../../Layouts/AddNewStaffLayout";
import AddPayrollLayout from "../../Layouts/AddPayrollLayout";
import AddStaffTaskLayout from "../../Layouts/AddStaffTaskLayout";
import AddAttendanceLayout from '../../Layouts/AddAttendanceLayout';
import AddScheduleLayout from "../../Layouts/AddScheduleLayout";



export default function StaffManagement({
  staff = [],
  attendance = [],
  payroll = [],
  tasks = [],
  schedules = [],
  staffData,
  payrollData
}) {
  // =========================== STATES & HOOKS ===========================

  const theme = useTheme();

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");

  // -------------- STAFF STATES -------------------
  const [staffRecords, setStaffRecords] = useState(staff);
  const [filteredStaff, setFilteredStaff] = useState(staff);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isViewStaffOpen, setViewStaffOpen] = useState(false);
  const [isEditStaffOpen, setEditStaffOpen] = useState(false);
  const [isAddStaffOpen, setAddStaffOpen] = useState(false);
  const [clientHourly, setClientHourly] = useState("");
  const [clientOvertime, setClientOvertime] = useState("");

  // -------------- ATTENDANCE STATES -------------------
  const [attendanceRecords, setAttendanceRecords] = useState(attendance);
  const [filteredAttendance, setFilteredAttendance] = useState(attendance);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [isViewAttendanceOpen, setViewAttendanceOpen] = useState(false);
  const [isEditAttendanceOpen, setEditAttendanceOpen] = useState(false);
  const [isAddAttendanceOpen, setAddAttendanceOpen] = useState(false);

  // -------------- PAYROLL STATES -------------------
  const [payrollRecords, setPayrollRecords] = useState(payroll);
  const [filteredPayroll, setFilteredPayroll] = useState(payroll);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [isViewPayrollOpen, setViewPayrollOpen] = useState(false);
  const [isEditPayrollOpen, setEditPayrollOpen] = useState(false);
  const [isAddPayrollOpen, setAddPayrollOpen] = useState(false);
  const [payrollFilterStart, setPayrollFilterStart] = useState("");
  const [payrollFilterEnd, setPayrollFilterEnd] = useState("");

  // -------------- TASK STATES -------------------
  const [taskRecords, setTaskRecords] = useState(tasks);
  const [filteredTasks, setFilteredTasks] = useState(tasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isViewTaskOpen, setViewTaskOpen] = useState(false);
  const [isEditTaskOpen, setEditTaskOpen] = useState(false);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);

  // -------------- SCHEDULE STATES -------------------
  const [scheduleRecords, setScheduleRecords] = useState(schedules);
  const [filteredSchedule, setFilteredSchedule] = useState(schedules);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isViewScheduleOpen, setViewScheduleOpen] = useState(false);
  const [isEditScheduleOpen, setEditScheduleOpen] = useState(false);
  const [isAddScheduleOpen, setAddScheduleOpen] = useState(false);

  // -------------- TABS & FILTERS -------------------
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [timePeriod, setTimePeriod] = useState("daily");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branch, setBranch] = useState("all");
  const [branchOptions, setBranchOptions] = useState([
    { value: "all", label: "All Branches" }, // Initial 'all' option
  ]);

  // Role-based filter
  const [role, setRole] = useState("all"); // default "all" => show everything
  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "Gym", label: "Gym" },
    { value: "Yogurt", label: "Yogurt" },
    { value: "Cafe", label: "Cafe" },
  ];
  // “Selected Staff” filter
  const [selectedStaffFilter, setSelectedStaffFilter] = useState("all");


  // ---- Delete Confirmation Dialog State ----
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState({ type: "", id: null });

  // =========================== HELPER FUNCTIONS ===========================

  // Date translator
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Snackbar helper
  const showSuccessMessage = (msg) => {
    setSnackMessage(msg);
    setSnackOpen(true);
  };

  // Time translator
  const formatTime = (timeString) => {
    if (!timeString) return "—";
    const date = new Date(`1970-01-01T${timeString}`);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  function handleNewStaffCreated(resData) {
    console.log("New staff from server => ", resData.staff);
    // Instead of setStaffRecords with partial data, go straight to re-fetch:
    axios
      .get(route("staff.index"))
      .then((response) => {
        setStaffRecords(response.data);
        setFilteredStaff(response.data);
        showSuccessMessage("New staff added successfully!");
      })
      .catch((err) => console.error("Error fetching updated staff list:", err));
  }
  

  // Called by AddPayrollLayout => new payroll created
  function handleNewPayrollCreated(resData) {
    const payrollObj = resData.payroll;
    setPayrollRecords((prev) => [payrollObj, ...prev]);
    setFilteredPayroll((prev) => [payrollObj, ...prev]);
    showSuccessMessage("New payroll record added successfully!");
  }

  // Called by AddTaskLayout => new task created
  function handleNewTaskCreated(resData) {
    const taskObj = resData.task;
    setTaskRecords((prev) => [taskObj, ...prev]);
    setFilteredTasks((prev) => [taskObj, ...prev]);
    showSuccessMessage("New task assigned successfully!");
  }

  // Helper function to handle newly created attendance records
  function handleNewAttendanceCreated(resData) {
    const newAttendance = resData.attendance;
    setAttendanceRecords((prev) => [newAttendance, ...prev]);
    setFilteredAttendance((prev) => [newAttendance, ...prev]);
    showSuccessMessage("New attendance record added successfully!");
  }

  // Delete dialog open
  function openDeleteDialog(type, id) {
    setDeleteInfo({ type, id });
    setDeleteDialogOpen(true);
  }

  // Called when user clicks "Delete" in the confirmation modal
  function confirmDelete() {
    setDeleteDialogOpen(false);
    if (!deleteInfo.id || !deleteInfo.type) return;

    switch (deleteInfo.type) {
      case "staff":
        handleDeleteStaff(deleteInfo.id);
        break;
      case "attendance":
        handleDeleteAttendance(deleteInfo.id);
        break;
      case "payroll":
        handleDeletePayroll(deleteInfo.id);
        break;
      case "task":
        handleDeleteTask(deleteInfo.id);
        break;
      case "schedule":
        handleDeleteSchedule(deleteInfo.id);
        break;
      default:
        break;
    }
  }

  // =========================== STAFF CRUD ===========================

  const handleViewStaff = (record) => {
    setSelectedStaff(record);
    setViewStaffOpen(true);
  };

  const handleEditStaff = (record) => {
    setSelectedStaff(record);
    setEditStaffOpen(true);
  };

  async function handleDeleteStaff(staffID) {
    try {
      await axios.delete(route("staff.destroy", staffID));
      setStaffRecords((prev) => prev.filter((s) => s.StaffID !== staffID));
      setFilteredStaff((prev) => prev.filter((s) => s.StaffID !== staffID));
    } catch (error) {
      console.error("Error deleting staff:", error);
    }
  }

  async function handleEditStaffSubmit() {
    try {
      const staffID = selectedStaff.StaffID;

      // Build the payload
      const payload = {
        FullName: selectedStaff.FullName,
        Email: selectedStaff.Email,
        Role: selectedStaff.Role,
        Phone: selectedStaff.Phone,
        DateHired: selectedStaff.DateHired,
        DailyRate: selectedStaff.DailyRate,
        Notes: selectedStaff.Notes,
        BranchIDs: selectedStaff.BranchIDs || [],
      };

      // If you physically store them, do:
      payload.HourlyRate = clientHourly;
      payload.OvertimeRate = clientOvertime;

      const response = await axios.put(`/staff/${staffID}`, payload);
      const updatedStaff = response.data.staff;

      setStaffRecords((prev) =>
        prev.map((s) => (s.StaffID === staffID ? updatedStaff : s))
      );
      setFilteredStaff((prev) =>
        prev.map((s) => (s.StaffID === staffID ? updatedStaff : s))
      );
      setEditStaffOpen(false);
    } catch (error) {
      console.error("Error updating staff:", error);
      alert("Failed to update staff. Check console for details.");
    }
  }

  // Auto-calculate Hourly/OT on staff load
  useEffect(() => {
    if (selectedStaff) {
      const daily = parseFloat(selectedStaff.DailyRate) || 0;
      if (daily > 0) {
        const hr = (daily / 8).toFixed(2);
        const ot = (hr * 1.25).toFixed(2);
        setClientHourly(hr);
        setClientOvertime(ot);
      } else {
        setClientHourly("");
        setClientOvertime("");
      }
    }
  }, [selectedStaff]);

  // =========================== ATTENDANCE CRUD ===========================

  const handleViewAttendance = (record) => {
    setSelectedAttendance(record);
    setViewAttendanceOpen(true);
  };

  const handleEditAttendance = (record) => {
    setSelectedAttendance(record);
    setEditAttendanceOpen(true);
  };

  async function handleEditAttendanceSubmit() {
    try {
      const id = selectedAttendance.AttendanceID;
      await axios.put(
        route("staff.attendance.update", id),
        selectedAttendance
      );

      setAttendanceRecords((prev) =>
        prev.map((a) =>
          a.AttendanceID === id ? { ...a, ...selectedAttendance } : a
        )
      );
      setFilteredAttendance((prev) =>
        prev.map((a) =>
          a.AttendanceID === id ? { ...a, ...selectedAttendance } : a
        )
      );

      setEditAttendanceOpen(false);
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  }

  async function handleDeleteAttendance(attendanceID) {
    try {
      await axios.delete(route("staff.attendance.destroy", attendanceID));
      setAttendanceRecords((prev) =>
        prev.filter((a) => a.AttendanceID !== attendanceID)
      );
      setFilteredAttendance((prev) =>
        prev.filter((a) => a.AttendanceID !== attendanceID)
      );
    } catch (error) {
      console.error("Error deleting attendance:", error);
    }
  }

  // =========================== PAYROLL CRUD ===========================

  const handleAddPayroll = () => {
    setAddPayrollOpen(true);
  };

  const handleClosePayrollDialog = () => {
    setAddPayrollOpen(false);
  };

  // Filter payroll records based on GeneratedDate
  const handleFilterPayroll = () => {
    if (!payrollFilterStart || !payrollFilterEnd) {
      alert("Please select both start and end dates for filtering.");
      return;
    }
    const start = new Date(payrollFilterStart);
    const end = new Date(payrollFilterEnd);
    const filtered = payrollRecords.filter((p) => {
      const generated = new Date(p.GeneratedDate);
      return generated >= start && generated <= end;
    });
    setFilteredPayroll(filtered);
  };

  const handleResetPayrollFilter = () => {
    setPayrollFilterStart("");
    setPayrollFilterEnd("");
    setFilteredPayroll(payrollRecords);
  };

  // Calculate total Net Pay from the currently filtered payroll records
  const handleCalculateTotalNetPay = () => {
    const total = filteredPayroll.reduce((sum, p) => {
      return sum + Number(p.NetPay || 0);
    }, 0);
    alert(`Total Net Pay for the selected period: ₱${total.toFixed(2)}`);
  };

  const handleViewPayroll = async (record) => {
    try {
      const staffID = record.StaffID;
      const start = record.StartDate;
      const end = record.EndDate;

      // 1) Fetch attendance + schedules
      const { attendance, schedules } = await fetchAttendanceAndSchedules(
        staffID,
        start,
        end
      );

      // 2) staff’s rates
      const hourlyRate = parseFloat(record.staff?.HourlyRate ?? 0);
      const overtimeRate = parseFloat(record.staff?.OvertimeRate ?? 0);

      // 3) Compute payroll
      const stats = computePayrollFromSchedules(
        attendance,
        schedules,
        hourlyRate,
        overtimeRate,
        start,
        end
      );

      record.TotalRegularHours = stats.totalRegularHours;
      record.TotalOvertimeHours = stats.totalOvertimeHours;
      record.LateDeductions = stats.totalLateDeductions;
      record.DaysAbsent = stats.daysAbsent;
      record.ComputedGross = stats.grossPay;

      const combinedDeductions =
        (parseFloat(record.Deductions) || 0) +
        stats.totalLateDeductions +
        (parseFloat(record.CashAdvance) || 0);

      record.ComputedNet = stats.grossPay - combinedDeductions;

      setSelectedPayroll(record);
      setViewPayrollOpen(true);
    } catch (error) {
      console.error("Error loading payroll details:", error);
      setSelectedPayroll(record);
      setViewPayrollOpen(true);
    }
  };

  const handleEditPayroll = (record) => {
    setSelectedPayroll(record);
    setEditPayrollOpen(true);
  };

  async function handleDeletePayroll(payrollID) {
    try {
      await axios.delete(route("staff.payroll.destroy", payrollID));
      setPayrollRecords((prev) =>
        prev.filter((p) => p.PayrollID !== payrollID)
      );
      setFilteredPayroll((prev) =>
        prev.filter((p) => p.PayrollID !== payrollID)
      );
    } catch (error) {
      console.error("Error deleting payroll:", error);
    }
  }

  async function handleEditPayrollSubmit(updatedData) {
    // Use `updatedData` instead of `selectedPayroll`
    const payrollID = updatedData.PayrollID;
  
    const payload = {
      StartDate:     updatedData.StartDate,
      EndDate:       updatedData.EndDate,
      Deductions:    updatedData.Deductions ?? 0,
      CashAdvance:   updatedData.CashAdvance ?? 0,
      GeneratedDate: updatedData.GeneratedDate || null,
      Status:        updatedData.Status || "Pending",
    };
  
    const response = await axios.put(route("staff.payroll.update", payrollID), payload);
    const updatedPayroll = response.data.payroll;
  
    setPayrollRecords((prev) =>
      prev.map((p) => (p.PayrollID === payrollID ? updatedPayroll : p))
    );
    setFilteredPayroll((prev) =>
      prev.map((p) => (p.PayrollID === payrollID ? updatedPayroll : p))
    );
  
    setEditPayrollOpen(false);
  }
  

  // =========================== TASKS CRUD ===========================

  const handleViewTask = (record) => {
    setSelectedTask(record);
    setViewTaskOpen(true);
  };

  const handleEditTask = (record) => {
    setSelectedTask(record);
    setEditTaskOpen(true);
  };

  async function handleDeleteTask(taskID) {
    try {
      await axios.delete(route("staff.tasks.destroy", taskID));
      setTaskRecords((prev) => prev.filter((t) => t.TaskID !== taskID));
      setFilteredTasks((prev) => prev.filter((t) => t.TaskID !== taskID));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }

  async function handleEditTaskSubmit() {
    try {
      const id = selectedTask.TaskID;
      await axios.put(route("staff.tasks.update", id), selectedTask);

      setTaskRecords((prev) =>
        prev.map((t) =>
          t.TaskID === id ? { ...t, ...selectedTask } : t
        )
      );
      setFilteredTasks((prev) =>
        prev.map((t) =>
          t.TaskID === id ? { ...t, ...selectedTask } : t
        )
      );

      setEditTaskOpen(false);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  }

  // =========================== SCHEDULE CRUD ===========================

  const handleViewSchedule = (record) => {
    setSelectedSchedule(record);
    setViewScheduleOpen(true);
  };

  const handleEditSchedule = (record) => {
    setSelectedSchedule(record);
    setEditScheduleOpen(true);
  };

  async function handleEditScheduleSubmit() {
    try {
      const id = selectedSchedule.ScheduleID;
      await axios.put(route("staff.schedules.update", id), selectedSchedule);

      setScheduleRecords((prev) =>
        prev.map((sc) =>
          sc.ScheduleID === id ? { ...sc, ...selectedSchedule } : sc
        )
      );
      setFilteredSchedule((prev) =>
        prev.map((sc) =>
          sc.ScheduleID === id ? { ...sc, ...selectedSchedule } : sc
        )
      );

      setEditScheduleOpen(false);
    } catch (error) {
      console.error("Error updating schedule:", error);
    }
  }

  async function handleDeleteSchedule(scheduleID) {
    try {
      await axios.delete(route("staff.schedules.destroy", scheduleID));
      setScheduleRecords((prev) =>
        prev.filter((sc) => sc.ScheduleID !== scheduleID)
      );
      setFilteredSchedule((prev) =>
        prev.filter((sc) => sc.ScheduleID !== scheduleID)
      );
    } catch (error) {
      console.error(error);
    }
  }

  // =========================== GLOBAL FILTERS & TAB LOGIC ===========================

  function handleRoleChange(e) {
    setRole(e.target.value);
    // applyAllFilters(); // optional if you rely on useEffect
  }

  function handleBranchChange(e) {
    setBranch(e.target.value);
    // applyAllFilters(); // optional if you rely on useEffect
  }

  function handleSearchChange(e) {
    setSearchTerm(e.target.value.toLowerCase());
    // applyAllFilters(); // optional if you rely on useEffect
  }

  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue);
    setSearchTerm("");
    if (newValue === 0) setFilteredStaff(staffRecords);
    else if (newValue === 1) setFilteredAttendance(attendanceRecords);
    else if (newValue === 2) setFilteredPayroll(payrollRecords);
    else if (newValue === 3) setFilteredTasks(taskRecords);
    else setFilteredSchedule(scheduleRecords);
  };

  function applyAllFilters() {
    let staffList = [...staffRecords];

    // 1) Filter by Branch
    if (branch !== "all") {
      const branchID = Number(branch);
      staffList = staffList.filter((s) =>
        s.branches && s.branches.some((b) => b.BranchID === branchID)
      );
    }

    // 2) Filter by Role
    if (role !== "all") {
      staffList = staffList.filter((s) => s.Role === role);
    }

    // 3) Text Search
    if (searchTerm.trim()) {
      const val = searchTerm.toLowerCase();
      staffList = staffList.filter((s) => {
        let rowText = `${s.FullName} ${s.Email} ${s.Phone} ${s.Role}`.toLowerCase();
        if (s.branches) {
          s.branches.forEach((b) => {
            rowText += ` ${b.BranchName?.toLowerCase()}`;
          });
        }
        return rowText.includes(val);
      });
    } 

     // 4) **Filter by Staff** if selectedStaffFilter != "all"
      if (selectedStaffFilter !== "all") {
        const filterStaffID = Number(selectedStaffFilter);
        // staffList is already the main staff array (after other filters)
        staffList = staffList.filter((s) => s.StaffID === filterStaffID);
      }

    setFilteredStaff(staffList);

    const staffIDs = staffList.map((s) => s.StaffID);

    // A) Attendance
    let attendanceList = attendanceRecords.filter((a) =>
      staffIDs.includes(a.StaffID)
    );
    if (searchTerm.trim()) {
      const val = searchTerm.toLowerCase();
      attendanceList = attendanceList.filter((a) => {
        let rowText = `${a.Date} ${a.TimeIn} ${a.TimeOut} ${a.HoursWorked} ${a.OvertimeHours}`.toLowerCase();
        if (a.staff && a.staff.FullName) {
          rowText += ` ${a.staff.FullName.toLowerCase()}`;
        }
        return rowText.includes(val);
      });
    }
    setFilteredAttendance(attendanceList);

    // B) Payroll
    let payrollList = payrollRecords.filter((p) =>
      staffIDs.includes(p.StaffID)
    );
    if (searchTerm.trim()) {
      const val = searchTerm.toLowerCase();
      payrollList = payrollList.filter((p) => {
        let rowText = `${p.StartDate} ${p.EndDate} ${p.GrossPay} ${p.NetPay} ${p.Status}`.toLowerCase();
        if (p.staff && p.staff.FullName) {
          rowText += ` ${p.staff.FullName.toLowerCase()}`;
        }
        rowText += ` ${p.CashAdvance} ${p.Deductions}`;
        return rowText.includes(val);
      });
    }
    setFilteredPayroll(payrollList);

    // C) Tasks
    let tasksList = taskRecords.filter((t) =>
      staffIDs.includes(t.StaffID)
    );
    if (searchTerm.trim()) {
      const val = searchTerm.toLowerCase();
      tasksList = tasksList.filter((t) => {
        let rowText = `${t.TaskDescription} ${t.TaskDate} ${t.Status}`.toLowerCase();
        if (t.staff && t.staff.FullName) {
          rowText += ` ${t.staff.FullName.toLowerCase()}`;
        }
        return rowText.includes(val);
      });
    }
    setFilteredTasks(tasksList);

    // D) Schedules
    let scheduleList = scheduleRecords.filter((sc) =>
      staffIDs.includes(sc.StaffID)
    );
    if (searchTerm.trim()) {
      const val = searchTerm.toLowerCase();
      scheduleList = scheduleList.filter((sc) => {
        let rowText = `${sc.ShiftDate} ${sc.ShiftStart} ${sc.ShiftEnd} ${sc.ShiftType}`.toLowerCase();
        if (sc.staff && sc.staff.FullName) {
          rowText += ` ${sc.staff.FullName.toLowerCase()}`;
        }
        return rowText.includes(val);
      });
    }
    setFilteredSchedule(scheduleList);
  }

  // =========================== INITIAL DATA LOADER (useEffect) ===========================

  useEffect(() => {
    axios
      .get("/owner/branches")
      .then((res) => {
        const branchData = res.data.branches || [];
        const newBranchOptions = branchData.map((b) => ({
          value: b.BranchID,
          label: b.BranchName,
        }));
        setBranchOptions([{ value: "all", label: "All Branches" }, ...newBranchOptions]);
      })
      .catch((err) => {
        console.error("Error fetching branches:", err);
      });

    // 1. Staff
    axios
      .get(route("staff.index"))
      .then((response) => {
        setStaffRecords(response.data);
        setFilteredStaff(response.data);
      })
      .catch((err) => console.error("Error fetching staff:", err));

    // 2. Attendance
    axios
      .get(route("staff.attendance.index"))
      .then((res) => {
        setAttendanceRecords(res.data);
        setFilteredAttendance(res.data);
      })
      .catch((err) => console.error("Error fetching attendance:", err));

    // 3. Payroll
    axios
      .get(route("staff.payroll.index"))
      .then((res) => {
        setPayrollRecords(res.data);
        setFilteredPayroll(res.data);
      })
      .catch((err) => console.error("Error fetching payroll:", err));

    // 4. Tasks
    axios
      .get(route("staff.tasks.index"))
      .then((res) => {
        setTaskRecords(res.data);
        setFilteredTasks(res.data);
      })
      .catch((err) => console.error("Error fetching tasks:", err));

    // 5. Schedules
    axios
      .get(route("staff.schedules.index"))
      .then((res) => {
        setScheduleRecords(res.data);
        setFilteredSchedule(res.data);
      })
      .catch((err) => console.error("Error fetching schedules:", err));
  }, []);

  // =========================== TABLE COLUMNS ===========================

  const staffColumns = [
    {
      field: "StaffID",
      headerName: "Staff ID",
      width: 80,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "FullName",
      headerName: "Full Name",
      width: 160,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Email",
      headerName: "Email",
      width: 160,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Phone",
      headerName: "Phone",
      width: 120,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Role",
      headerName: "Role",
      width: 120,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Branch",
      headerName: "Branches",
      width: 250,
      renderCell: (params) => {
        const branches = params.row.branches || [];
        return branches.length > 0
          ? branches.map((b) => b.BranchName).join(", ")
          : "—";
      },
    },
    {
      field: "DateHired",
      headerName: "Hired",
      width: 150,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : "—",
    },
    {
      field: "DailyRate",
      headerName: "Daily Rate",
      width: 100,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "HourlyRate",
      headerName: "Hourly",
      width: 90,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "OvertimeRate",
      headerName: "Overtime",
      width: 100,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Notes",
      headerName: "Notes",
      width: 150,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#4caf50",
                color: "#fff",
                "&:hover": { backgroundColor: "#43a047" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleViewStaff(params.row)}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#2196f3",
                color: "#fff",
                "&:hover": { backgroundColor: "#1976d2" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleEditStaff(params.row)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#f44336",
                color: "#fff",
                "&:hover": { backgroundColor: "#d32f2f" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() =>
                openDeleteDialog("staff", params.row.StaffID)
              }
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const attendanceColumns = [
    {
      field: "Date",
      headerName: "Date",
      width: 150,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : "—",
    },
    {
      field: "StaffID",
      headerName: "Staff Name",
      width: 150,
      renderCell: (params) => params.row.staff?.FullName ?? "—",
    },
    {
      field: "TimeIn",
      headerName: "Time In",
      width: 110,
      renderCell: (params) =>
        params.value ? formatTime(params.value) : "—",
    },
    {
      field: "TimeOut",
      headerName: "Time Out",
      width: 110,
      renderCell: (params) =>
        params.value ? formatTime(params.value) : "—",
    },
    {
      field: "HoursWorked",
      headerName: "Hours",
      width: 80,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "OvertimeHours",
      headerName: "Overtime",
      width: 100,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "NightDiffHours",
      headerName: "Night Diff",
      width: 100,
      renderCell: (params) => params.value || 0,
    },
    {
      field: "LateMinutes",
      headerName: "Late Mins",
      width: 100,
      renderCell: (params) => params.value || 0,
    },
    {
      field: "PayrollID",
      headerName: "Payroll ID",
      width: 110,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#4caf50",
                color: "#fff",
                "&:hover": { backgroundColor: "#43a047" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleViewAttendance(params.row)}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#2196f3",
                color: "#fff",
                "&:hover": { backgroundColor: "#1976d2" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleEditAttendance(params.row)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#f44336",
                color: "#fff",
                "&:hover": { backgroundColor: "#d32f2f" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() =>
                openDeleteDialog("attendance", params.row.AttendanceID)
              }
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const payrollColumns = [
    {
      field: "StartDate",
      headerName: "Cycle Start",
      width: 130,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : "—",
    },
    {
      field: "EndDate",
      headerName: "Cycle End",
      width: 130,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : "—",
    },
    {
      field: "StaffID",
      headerName: "Staff Name",
      width: 150,
      renderCell: (params) =>
        params.row.staff ? params.row.staff.FullName : "N/A",
    },
    {
      field: "RegHours",
      headerName: "Total Hours",
      width: 100,
      renderCell: (params) => {
        const att = params.row.computed_attendances || [];
        let total = 0;
        att.forEach((a) => {
          const hrs = parseFloat(a.HoursWorked) || 0;
          total += Math.min(hrs, 8);
        });
        return total.toFixed(2);
      },
    },
    {
      field: "OTHours",
      headerName: "Total OT",
      width: 100,
      renderCell: (params) => {
        const att = params.row.computed_attendances || [];
        let totalOT = 0;
        att.forEach((a) => {
          const hrs = parseFloat(a.HoursWorked) || 0;
          const possibleOT = hrs > 8 ? hrs - 8 : 0;
          const approvedOT = parseFloat(a.OvertimeHours) || 0;
          totalOT += Math.min(possibleOT, approvedOT);
        });
        return totalOT.toFixed(2);
      },
    },
    {
      field: "LateMins",
      headerName: "Total Min. Late",
      width: 150,
      renderCell: (params) => {
        const att = params.row.computed_attendances || [];
        let totalLate = 0;
        att.forEach((a) => {
          totalLate += parseFloat(a.LateMinutes) || 0;
        });
        return totalLate;
      },
    },
    {
      field: "NDHours",
      headerName: "Total NDHours",
      width: 115,
      renderCell: (params) => {
        const att = params.row.computed_attendances || [];
        let totalND = 0;
        att.forEach((a) => {
          totalND += parseFloat(a.NightDiffHours) || 0;
        });
        return totalND.toFixed(2);
      },
    },
    {
      field: "GrossPay",
      headerName: "Gross",
      width: 90,
      renderCell: (params) =>
        `₱${params.value ? parseFloat(params.value).toFixed(2) : "0.00"}`,
    },
    {
      field: "Deductions",
      headerName: "M.Deductions",
      width: 115,
      renderCell: (params) =>
        `₱${params.value ? parseFloat(params.value).toFixed(2) : "0.00"}`,
    },
    {
      field: "CashAdvance",
      headerName: "Advance",
      width: 100,
      renderCell: (params) =>
        `₱${params.value ? parseFloat(params.value).toFixed(2) : "0.00"}`,
    },
    {
      field: "NetPay",
      headerName: "Net Pay",
      width: 90,
      renderCell: (params) =>
        `₱${params.value ? parseFloat(params.value).toFixed(2) : "0.00"}`,
    },
    {
      field: "Status",
      headerName: "Status",
      width: 120,
    },
    {
      field: "GeneratedDate",
      headerName: "Generated Date",
      width: 120,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : "—",
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#4caf50",
                color: "#fff",
                "&:hover": { backgroundColor: "#43a047" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleViewPayroll(params.row)}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#2196f3",
                color: "#fff",
                "&:hover": { backgroundColor: "#1976d2" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleEditPayroll(params.row)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#f44336",
                color: "#fff",
                "&:hover": { backgroundColor: "#d32f2f" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() =>
                openDeleteDialog("payroll", params.row.PayrollID)
              }
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const taskColumns = [
    {
      field: "TaskDate",
      headerName: "Date",
      width: 180,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : "—",
    },
    { field: "TaskDescription", headerName: "Description", width: 350 },
    {
      field: "StaffID",
      headerName: "Staff Name",
      width: 150,
      renderCell: (params) => {
        return params.row.staff ? params.row.staff.FullName : "N/A";
      },
    },
    {
      field: "Status",
      headerName: "Status",
      width: 200,
      renderCell: (params) => (
        <span
          style={{
            color: params.value === "Completed" ? "limegreen" : "orange",
          }}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#4caf50",
                color: "#fff",
                "&:hover": { backgroundColor: "#43a047" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleViewTask(params.row)}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#2196f3",
                color: "#fff",
                "&:hover": { backgroundColor: "#1976d2" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleEditTask(params.row)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#f44336",
                color: "#fff",
                "&:hover": { backgroundColor: "#d32f2f" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() =>
                openDeleteDialog("task", params.row.TaskID)
              }
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const scheduleColumns = [
    {
      field: "ShiftDate",
      headerName: "Date",
      width: 130,
    },
    {
      field: "StaffID",
      headerName: "Staff Name",
      width: 150,
      renderCell: (params) =>
        params.row.staff ? params.row.staff.FullName : "—",
    },
    {
      field: "ShiftStart",
      headerName: "Start",
      width: 100,
    },
    {
      field: "ShiftEnd",
      headerName: "End",
      width: 100,
    },
    {
      field: "ShiftType",
      headerName: "Type",
      width: 110,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "RoleOverride",
      headerName: "Role Override",
      width: 150,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#4caf50",
                color: "#fff",
                "&:hover": { backgroundColor: "#43a047" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleViewSchedule(params.row)}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#2196f3",
                color: "#fff",
                "&:hover": { backgroundColor: "#1976d2" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => handleEditSchedule(params.row)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#f44336",
                color: "#fff",
                "&:hover": { backgroundColor: "#d32f2f" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() =>
                openDeleteDialog("schedule", params.row.ScheduleID)
              }
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // =========================== DATAGRID LOGIC ===========================

  const columns =
    activeTab === 0
      ? staffColumns
      : activeTab === 1
      ? attendanceColumns
      : activeTab === 2
      ? payrollColumns
      : activeTab === 3
      ? taskColumns
      : scheduleColumns;

  const getRowId = (row) => {
    if (!row) return null;
    if (activeTab === 0) return row?.StaffID;
    if (activeTab === 1) return row?.AttendanceID;
    if (activeTab === 2) return row?.PayrollID;
    if (activeTab === 3) return row?.TaskID;
    return row?.ScheduleID;
  };

  const rows =
    activeTab === 0
      ? filteredStaff
      : activeTab === 1
      ? filteredAttendance
      : activeTab === 2
      ? filteredPayroll
      : activeTab === 3
      ? filteredTasks
      : filteredSchedule;

  // =========================== EXPORT FUNCTIONALITY ===========================

  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  const handleExportMenuOpen = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };

  const staffCSVHeaders = [
    { label: "StaffID", key: "StaffID" },
    { label: "FullName", key: "FullName" },
    { label: "Email", key: "Email" },
    { label: "Phone", key: "Phone" },
    { label: "Role", key: "Role" },
    { label: "BranchID", key: "BranchID" },
    { label: "DateHired", key: "DateHired" },
    { label: "DailyRate", key: "DailyRate" },
    { label: "HourlyRate", key: "HourlyRate" },
    { label: "OvertimeRate", key: "OvertimeRate" },
    { label: "Notes", key: "Notes" },
  ];

  const attendanceCSVHeaders = [
    { label: "AttendanceID", key: "AttendanceID" },
    { label: "StaffID", key: "StaffID" },
    { label: "Date", key: "Date" },
    { label: "TimeIn", key: "TimeIn" },
    { label: "TimeOut", key: "TimeOut" },
    { label: "HoursWorked", key: "HoursWorked" },
    { label: "OvertimeHours", key: "OvertimeHours" },
    { label: "PayrollID", key: "PayrollID" },
  ];

  const payrollCSVHeaders = [
    { label: "PayrollID", key: "PayrollID" },
    { label: "StaffID", key: "StaffID" },
    { label: "StartDate", key: "StartDate" },
    { label: "EndDate", key: "EndDate" },
    { label: "GrossPay", key: "GrossPay" },
    { label: "Deductions", key: "Deductions" },
    { label: "NetPay", key: "NetPay" },
    { label: "GeneratedDate", key: "GeneratedDate" },
    { label: "Status", key: "Status" },
  ];

  const taskCSVHeaders = [
    { label: "TaskID", key: "TaskID" },
    { label: "StaffID", key: "StaffID" },
    { label: "TaskDescription", key: "TaskDescription" },
    { label: "TaskDate", key: "TaskDate" },
    { label: "Status", key: "Status" },
  ];

  const scheduleCSVHeaders = [
    { label: "ScheduleID", key: "ScheduleID" },
    { label: "StaffID", key: "StaffID" },
    { label: "ShiftDate", key: "ShiftDate" },
    { label: "ShiftStart", key: "ShiftStart" },
    { label: "ShiftEnd", key: "ShiftEnd" },
    { label: "RoleOverride", key: "RoleOverride" },
  ];

  let csvData = [];
  let csvHeaders = [];
  let csvFilename = "";
  if (activeTab === 0) {
    csvData = rows;
    csvHeaders = staffCSVHeaders;
    csvFilename = "Staff.csv";
  } else if (activeTab === 1) {
    csvData = rows;
    csvHeaders = attendanceCSVHeaders;
    csvFilename = "Attendance.csv";
  }

  const handleExportCSV = () => {
    handleExportMenuClose();
  };

  const handleExportPDF = () => {
    handleExportMenuClose();
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const coverPage = "/imgs/coverpage2.png";
    const addPage = "/imgs/addpage2.png";

    let tableHeaders = [];
    let tableBody = [];
    let title = "";

    if (activeTab === 0) {
      tableHeaders = [
        "StaffID",
        "FullName",
        "Email",
        "Phone",
        "Role",
        "Branches",
        "DateHired",
        "DailyRate",
        "HourlyRate",
        "OvertimeRate",
        "Notes",
      ];
      tableBody = rows.map((s) => [
        s.StaffID || "—",
        s.FullName || "—",
        s.Email || "—",
        s.Phone || "—",
        s.Role || "—",
        s.branches && s.branches.length > 0
          ? s.branches.map((b) => b.BranchName).join(", ")
          : "—",
        formatDate(s.DateHired) || "—",
        `${parseFloat(s.DailyRate || 0).toFixed(2)}`,
        `${parseFloat(s.HourlyRate || 0).toFixed(2)}`,
        `${parseFloat(s.OvertimeRate || 0).toFixed(2)}`,
        s.Notes || "—",
      ]);
    } else if (activeTab === 1) {
      title = "Attendance Export";
      tableHeaders = [
        "ID",
        "StaffID",
        "Date",
        "TimeIn",
        "TimeOut",
        "Hours",
        "OT",
        "PayrollID",
      ];
      tableBody = rows.map((a) => [
        a.AttendanceID || "—",
        a.StaffID || "—",
        formatDate(a.Date) || "—",
        a.TimeIn || "—",
        a.TimeOut || "—",
        a.HoursWorked || "—",
        a.OvertimeHours || "—",
        a.PayrollID || "—",
      ]);
    } else if (activeTab === 2) {
      title = "Payroll Export";
      tableHeaders = [
        "ID",
        "StaffID",
        "Start",
        "End",
        "Gross",
        "Deductions",
        "NetPay",
        "Generated",
        "Status",
      ];
      tableBody = rows.map((p) => [
        p.PayrollID || "—",
        p.StaffID || "—",
        formatDate(p.StartDate) || "—",
        formatDate(p.EndDate) || "—",
        `${parseFloat(p.GrossPay || 0).toFixed(2)}`,
        `${parseFloat(p.Deductions || 0).toFixed(2)}`,
        `${parseFloat(p.NetPay || 0).toFixed(2)}`,
        formatDate(p.GeneratedDate) || "—",
        p.Status || "—",
      ]);
    } else if (activeTab === 3) {
      title = "Tasks Export";
      tableHeaders = ["ID", "StaffID", "Description", "Date", "Status"];
      tableBody = rows.map((t) => [
        t.TaskID || "—",
        t.StaffID || "—",
        t.TaskDescription || "—",
        formatDate(t.TaskDate) || "—",
        t.Status || "—",
      ]);
    } else {
      title = "Schedule Export";
      tableHeaders = ["ID", "StaffID", "Date", "Start", "End", "Override"];
      tableBody = rows.map((sc) => [
        sc.ScheduleID || "—",
        sc.StaffID || "—",
        formatDate(sc.ShiftDate) || "—",
        sc.ShiftStart || "—",
        sc.ShiftEnd || "—",
        sc.RoleOverride || "—",
      ]);
    }

    doc.addImage(coverPage, "PNG", 0, 0, pageWidth, pageHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor("#ffffff");
    doc.text(title || "Staff List", pageWidth / 2, 50, { align: "center" });

    doc.autoTable({
      startY: 100,
      head: [tableHeaders],
      body: tableBody,
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
        fillColor: "#f5f5f5",
      },
      styles: {
        overflow: "linebreak",
        cellPadding: 5,
        halign: "center",
        valign: "middle",
      },
      margin: { top: 100, left: 20, right: 20, bottom: 20 },
    });

    const pdfFilename =
      activeTab === 0
        ? "StaffList.pdf"
        : activeTab === 1
        ? "AttendanceList.pdf"
        : activeTab === 2
        ? "PayrollList.pdf"
        : activeTab === 3
        ? "TasksList.pdf"
        : "ScheduleList.pdf";

    doc.save(pdfFilename);
  };

  // =========================== PRINT PAYSLIP ===========================
  const handlePrintPayslip = () => {
    if (!selectedPayroll) return;

    const {
      StaffID,
      StartDate,
      EndDate,
      GrossPay,
      Deductions,
      NetPay,
      GeneratedDate,
      staff,
    } = selectedPayroll;

    const staffName = staff ? staff.FullName : "—";
    const dailyRate = staff ? parseFloat(staff.DailyRate) || 0 : 0;

    const periodMonth = StartDate
      ? new Date(StartDate).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "—";

    const generated = GeneratedDate
      ? new Date(GeneratedDate).toLocaleDateString("en-US")
      : new Date().toLocaleDateString("en-US");

    const grossPayNum = parseFloat(GrossPay) || 0;
    const deductionsNum = parseFloat(Deductions) || 0;

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.addImage("/imgs/payslip.png", "PNG", 0, 0, pageWidth, pageHeight);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(12);

    doc.text(generated, 140, 160); // Date Issued
    doc.text(staffName, 100, 195); // Staff Name
    doc.text(periodMonth, 215, 260); // Salary Month

    doc.text(`₱${dailyRate.toFixed(2)}`, 140, 315); // Daily Rate
    doc.text(`₱${grossPayNum.toFixed(2)}`, 450, 350, { align: "right" });

    const hoursWorked = selectedPayroll.HoursWorked || 0;
    const daysAbsent = selectedPayroll.DaysAbsent || 0;
    const lateDeductions = selectedPayroll.LateDeductions || 0;

    doc.text(`${hoursWorked}`, 240, 345);
    doc.text(`${daysAbsent}`, 240, 375);
    doc.text(`${lateDeductions}`, 240, 408);

    doc.text(`₱${deductionsNum.toFixed(2)}`, 230, 440);

    const subtotal = grossPayNum - deductionsNum;
    const tax = 0;
    const totalPay = subtotal - tax;

    doc.text(`₱${subtotal.toFixed(2)}`, 470, 522, { align: "right" });
    doc.text(`₱${tax.toFixed(2)}`, 470, 558, { align: "right" });
    doc.text(`₱${totalPay.toFixed(2)}`, 470, 603, { align: "right" });

    doc.text(staffName, 330, 740);
    doc.text(periodMonth, 205, 792);

    doc.save(`Payslip-${staffName}-${periodMonth}.pdf`);
  };

  // =========================== PAYROLL UTILITIES ===========================
  async function fetchAttendanceAndSchedules(staffId, start, end) {
    const attendanceUrl =
      route("staff.attendance.range", staffId) + `?start=${start}&end=${end}`;
    const attRes = await axios.get(attendanceUrl);
    const attendance = attRes.data;

    const scheduleUrl =
      route("staff.schedules.range", staffId) + `?start=${start}&end=${end}`;
    const schRes = await axios.get(scheduleUrl);
    const schedules = schRes.data;

    return { attendance, schedules };
  }

  function computePayrollFromSchedules(
    attendance,
    schedules,
    hourlyRate,
    overtimeRate,
    startDate,
    endDate
  ) {
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalLateDeductions = 0;

    const scheduleMap = {};
    schedules.forEach((sch) => {
      scheduleMap[sch.ShiftDate] = {
        ShiftStart: sch.ShiftStart,
        ShiftEnd: sch.ShiftEnd,
      };
    });

    attendance.forEach((att) => {
      const hrs = Number(att.HoursWorked || 0);
      if (hrs > 8) {
        totalRegularHours += 8;
        totalOvertimeHours += hrs - 8;
      } else {
        totalRegularHours += hrs;
      }

      const dateStr = att.Date;
      const sch = scheduleMap[dateStr];
      if (sch && att.TimeIn) {
        const shiftStartSec =
          new Date(`${dateStr}T${sch.ShiftStart}:00`).getTime() / 1000;
        const timeInSec =
          new Date(`${dateStr}T${att.TimeIn}:00`).getTime() / 1000;
        const graceEndSec = shiftStartSec + 10 * 60;
        if (timeInSec > graceEndSec) {
          const lateSeconds = timeInSec - graceEndSec;
          const lateMinutes = Math.floor(lateSeconds / 60);
          totalLateDeductions += lateMinutes;
        }
      }
    });

    const attendedDates = new Set(attendance.map((a) => a.Date));
    let dayCursor = new Date(startDate);
    const endD = new Date(endDate);
    endD.setHours(23, 59, 59, 999);
    let daysAbsent = 0;

    while (dayCursor <= endD) {
      const iso = dayCursor.toISOString().split("T")[0];
      if (scheduleMap[iso] && !attendedDates.has(iso)) {
        daysAbsent++;
      }
      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    const grossPay =
      totalRegularHours * (hourlyRate || 0) +
      totalOvertimeHours * (overtimeRate || 0);

    return {
      totalRegularHours,
      totalOvertimeHours,
      totalLateDeductions,
      daysAbsent,
      grossPay,
    };
  }

  // =========================== useEffect: AUTO-RUN FILTERS ===========================
  // Whenever role, branch, searchTerm, or your data arrays change, re-apply filters:
  useEffect(() => {
    applyAllFilters();
    // eslint-disable-next-line
  }, [
    role,
    branch,
    searchTerm,
    selectedStaffFilter,
    staffRecords,
    attendanceRecords,
    payrollRecords,
    taskRecords,
    scheduleRecords,
  ]); 
  return (
    <Box sx={{ p: 4 }}>

      {/* ------------------- TITLE & TABS ------------------- */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h4" gutterBottom>
          Staff Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Tab icon={<PeopleIcon />} label="Staff" />
          <Tab icon={<EmojiPeopleIcon />} label="Attendance" />
          <Tab icon={<ReceiptIcon />} label="Payroll" />
          <Tab icon={<AssignmentIcon />} label="Task" />
          <Tab icon={<CalendarMonthIcon />} label="Schedules" />
        </Tabs>
      </Box>

      {/* ------------------- DATA GRID & SEARCH ------------------- */}
      <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
    {/* Header Section: Filters and Action Buttons */}
    <Grid container spacing={2} alignItems="center" justifyContent="space-between">
      {/* Filters */}
      <Grid item xs={12} md={8}>
        <Grid container spacing={2} alignItems="center">
          {/* Branch Filter */}
          <Grid item>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Branch</InputLabel>
              <Select value={branch} onChange={handleBranchChange} label="Branch">
                {branchOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Role Filter */}
          <Grid item>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={role} onChange={handleRoleChange}>
                {roleOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Staff</InputLabel>
            <Select
              label="Staff"
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
            >
              <MenuItem value="all">All Staff</MenuItem>
              {staffRecords.map((s) => (
                <MenuItem key={s.StaffID} value={s.StaffID}>
                  {s.FullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          </Grid>
          {/* Search Field */}
          <Grid item xs>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearchChange}
              fullWidth
              sx={{ maxWidth: 350 }}
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Grid
        item
        xs={12}
        md={4}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        {/* Export Button and Menu */}
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportMenuOpen}
          sx={{ textTransform: "none" }}
        >
          Export
        </Button>
        <Menu
          anchorEl={exportAnchorEl}
          open={openExportMenu}
          onClose={handleExportMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <MenuItem onClick={handleExportCSV}>
            <CSVLink
              data={rows}
              headers={csvHeaders}
              filename={csvFilename}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Export CSV
            </CSVLink>
          </MenuItem>
          <MenuItem onClick={handleExportPDF}>Export PDF</MenuItem>
        </Menu>

        {/* Conditional "Add" Buttons for Various Tabs */}
        {activeTab === 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddStaffOpen(true)}
          >
            Add New Staff
          </Button>
        )}
        {activeTab === 1 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddAttendanceOpen(true)}
          >
            Add Attendance
          </Button>
        )}
        {activeTab === 3 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddTaskOpen(true)}
          >
            Add Task
          </Button>
        )}
        {activeTab === 4 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddScheduleOpen(true)}
          >
            Add Schedule
          </Button>
        )}
      </Grid>
    </Grid>

  {/* Payroll Controls (Active Tab 2) */}
  {activeTab === 2 && (
    <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
      <TextField
        label="Generated Start"
        type="date"
        value={payrollFilterStart}
        onChange={(e) => setPayrollFilterStart(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
      />
      <TextField
        label="Generated End"
        type="date"
        value={payrollFilterEnd}
        onChange={(e) => setPayrollFilterEnd(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
      />
      <Button variant="contained" color="primary" onClick={handleFilterPayroll}>
        Filter
      </Button>
      <Button variant="outlined" color="primary" onClick={handleResetPayrollFilter}>
        Reset
      </Button>
      <Button variant="contained" color="secondary" onClick={handleCalculateTotalNetPay}>
        Total Net Pay
      </Button>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={() => setAddPayrollOpen(true)}
      >
        Add Payroll
      </Button>
    </Box>
  )}

  {/* Data Grid Section */}
  <Box sx={{ mt: 2, height: 610, width: "100%" }}>
    <DataGrid
      rows={rows.filter((row) => row !== undefined)}
      columns={columns}
      getRowId={(row) => {
        if (activeTab === 0) return row.StaffID;
        if (activeTab === 1) return row.AttendanceID;
        if (activeTab === 2) return row.PayrollID;
        if (activeTab === 3) return row.TaskID;
        return row.ScheduleID;
      }}
      pageSize={5}
      rowsPerPageOptions={[5, 10]}
    />
  </Box>
      </Paper>


      {/* ------------------- RENDER EXTERNAL LAYOUTS ------------------- */}

     
          {isAddStaffOpen && (
            <AddNewStaffLayout
              onClose={() => setAddStaffOpen(false)}
              onStaffAdded={handleNewStaffCreated}
            />
          )}

          {isAddPayrollOpen && (
            <AddPayrollLayout
              onClose={() => setAddPayrollOpen(false)}
              onAdd={(newPayroll) => {
                // Now do axios => POST /staff/payroll with the final data
                axios.post(route("staff.payroll.store"), newPayroll)
                  .then((res) => handleNewPayrollCreated(res.data))
                  .catch((err) => console.error("Error adding payroll:", err));
              }}
              staffOptions={staffRecords.map((s) => ({
                value: s.StaffID,
                label: s.FullName,
                hourlyRate: s.HourlyRate,
                overtimeRate: s.OvertimeRate,
              }))}
            />
          )}


      {isAddTaskOpen && (
        <AddStaffTaskLayout
          onClose={() => setAddTaskOpen(false)}
          onAdd={(newTask) => {
            axios.post(route('staff.tasks.store'), newTask)
              .then(res => handleNewTaskCreated(res.data)) // Use the new function
              .catch(err => console.error('Error adding task:', err));
          }}

          staffOptions={staffRecords.map((s) => ({
            value: s.StaffID,
            label: s.FullName,
          }))}
        />
      )}

        {isAddAttendanceOpen && (
          <AddAttendanceLayout
            onClose={() => setAddAttendanceOpen(false)}
            onAdd={(attendanceData) => {
              axios
                .post(route("staff.attendance.store"), attendanceData)
                .then((res) => {
                  handleNewAttendanceCreated(res.data);
                  setAddAttendanceOpen(false);
                })
                .catch((err) => console.error("Error adding attendance:", err));
            }}
            staffOptions={staffRecords.map((s) => ({
              value: s.StaffID,
              label: s.FullName,
            }))}
          />
        )}

      {isAddScheduleOpen && (
        <AddScheduleLayout
          onClose={() => setAddScheduleOpen(false)}
          onSchedulesCreated={() => {
            axios.get(route("staff.schedules.index"))
              .then((res) => {
                setScheduleRecords(res.data);
                setFilteredSchedule(res.data);
              })
              .catch((err) => console.error("Error fetching updated schedules:", err));
          
            showSuccessMessage("New schedules created!");
            setAddScheduleOpen(false);
          }}
          staffOptions={staffRecords.map((s) => ({
            value: s.StaffID,
            label: s.FullName,
          }))}
        />
      )}

      {/* ------------------- VIEW & EDIT DIALOGS ------------------- */}

      {/* VIEW SCHEDULE */}
            <Dialog
        open={isViewScheduleOpen}
        onClose={() => setViewScheduleOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 3,
            boxShadow: 6,
            p: 3,
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <VisibilityIcon sx={{ fontSize: 30, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Schedule Details
              </Typography>
            </Box>
            <IconButton onClick={() => setViewScheduleOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {selectedSchedule && (
            <Grid container spacing={2}>
              {/* SHIFT DATE */}
              <Grid item xs={12}>
                <TextField
                  label="Shift Date"
                  variant="filled"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  value={selectedSchedule.ShiftDate || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>

              {/* STAFF NAME */}
              <Grid item xs={12}>
                <TextField
                  label="Staff Name"
                  variant="filled"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  value={selectedSchedule.staff?.FullName || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>

              {/* SHIFT START & END */}
              <Grid item xs={6}>
                <TextField
                  label="Shift Start"
                  variant="filled"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  value={selectedSchedule.ShiftStart || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Shift End"
                  variant="filled"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  value={selectedSchedule.ShiftEnd || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>

              {/* SHIFT TYPE */}
              <Grid item xs={12}>
                <TextField
                  label="Shift Type"
                  variant="filled"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  value={selectedSchedule.ShiftType || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>

              {/* ROLE OVERRIDE */}
              <Grid item xs={12}>
                <TextField
                  label="Role Override"
                  variant="filled"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  value={selectedSchedule.RoleOverride || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>


      {/* EDIT SCHEDULE */}
      <Dialog
        open={isEditScheduleOpen}
        onClose={() => setEditScheduleOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 3,
            boxShadow: 6,
            p: 3,
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <EditIcon sx={{ fontSize: 30, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Edit Schedule
              </Typography>
            </Box>
            <IconButton onClick={() => setEditScheduleOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {selectedSchedule && (
            <Grid container spacing={2}>
              {/* (Optional) Staff Selection if you want to reassign schedule */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Staff</InputLabel>
                  <Select
                    label="Staff"
                    value={selectedSchedule.StaffID || ""}
                    onChange={(e) =>
                      setSelectedSchedule((prev) => ({
                        ...prev,
                        StaffID: e.target.value,
                      }))
                    }
                  >
                    {staffRecords.map((s) => (
                      <MenuItem key={s.StaffID} value={s.StaffID}>
                        {s.FullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* SHIFT DATE */}
              <Grid item xs={12}>
                <TextField
                  label="Shift Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  variant="outlined"
                  value={selectedSchedule.ShiftDate || ""}
                  onChange={(e) =>
                    setSelectedSchedule((prev) => ({
                      ...prev,
                      ShiftDate: e.target.value,
                    }))
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>

              {/* SHIFT TYPE => auto-set times */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Shift Type</InputLabel>
                  <Select
                    label="Shift Type"
                    value={selectedSchedule.ShiftType || "dynamic"}
                    onChange={(e) => {
                      const newType = e.target.value;

                      // Auto-set ShiftStart, ShiftEnd if not dynamic
                      let shiftStart = selectedSchedule.ShiftStart || "";
                      let shiftEnd = selectedSchedule.ShiftEnd || "";

                      switch (newType) {
                        case "morning":
                          shiftStart = "05:30";
                          shiftEnd = "14:30";
                          break;
                        case "mid":
                          shiftStart = "10:00";
                          shiftEnd = "19:00";
                          break;
                        case "evening":
                          shiftStart = "15:00";
                          shiftEnd = "23:59";
                          break;
                        case "dynamic":
                          // keep existing or blank them out
                          shiftStart = "";
                          shiftEnd = "";
                          break;
                        default:
                          // fallback if needed
                          break;
                      }

                      setSelectedSchedule((prev) => ({
                        ...prev,
                        ShiftType: newType,
                        ShiftStart: shiftStart,
                        ShiftEnd: shiftEnd,
                      }));
                    }}
                  >
                    <MenuItem value="morning">Morning (5:30 AM - 2:30 PM)</MenuItem>
                    <MenuItem value="mid">Mid (10:00 AM - 7:00 PM)</MenuItem>
                    <MenuItem value="evening">Evening (3:00 PM - 11:59 PM)</MenuItem>
                    <MenuItem value="dynamic">Dynamic (Custom times)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* SHIFT START / END FIELDS */}
              <Grid item xs={6}>
                <TextField
                  label="Shift Start"
                  type="time"
                  fullWidth
                  variant="outlined"
                  value={selectedSchedule.ShiftStart || ""}
                  onChange={(e) =>
                    setSelectedSchedule((prev) => ({
                      ...prev,
                      ShiftStart: e.target.value,
                    }))
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Shift End"
                  type="time"
                  fullWidth
                  variant="outlined"
                  value={selectedSchedule.ShiftEnd || ""}
                  onChange={(e) =>
                    setSelectedSchedule((prev) => ({
                      ...prev,
                      ShiftEnd: e.target.value,
                    }))
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>

              {/* ROLE OVERRIDE */}
              <Grid item xs={12}>
                <TextField
                  label="Role Override"
                  fullWidth
                  variant="outlined"
                  value={selectedSchedule.RoleOverride || ""}
                  onChange={(e) =>
                    setSelectedSchedule((prev) => ({
                      ...prev,
                      RoleOverride: e.target.value,
                    }))
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button color="inherit" onClick={() => setEditScheduleOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleEditScheduleSubmit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>



      {/* VIEW STAFF */}
      <Dialog
      open={isViewStaffOpen}
      onClose={() => setViewStaffOpen(false)}
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Staff Details
            </Typography>
          </Box>
          <IconButton
            onClick={() => setViewStaffOpen(false)}
            sx={{
              "&:hover": { color: theme.palette.error.main },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 4 }}>
        {selectedStaff && (
          <Box sx={{ display: "flex", flexDirection: "row", gap: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <BadgeIcon color="primary" /> Personal Information
                </Typography>
                <TextField
                  fullWidth
                  label="Full Name"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={selectedStaff.FullName || "—"}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Email"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={selectedStaff.Email || "—"}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Phone"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={selectedStaff.Phone || "—"}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Role"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={selectedStaff.Role || "—"}
                  sx={{ mb: 2 }}
                />
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    mt: 3,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <NotesIcon color="primary" /> Notes
                </Typography>
                <TextField
                  fullWidth
                  label="Notes"
                  variant="filled"
                  multiline
                  rows={3}
                  InputProps={{ readOnly: true }}
                  value={
                    selectedStaff.Notes?.length
                      ? selectedStaff.Notes
                      : "No notes available."
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <BusinessIcon color="primary" /> Work Information
                </Typography>
                <TextField
                  fullWidth
                  label="Branch ID"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={selectedStaff.branches?.[0]?.BranchID || "—"}
                  sx={{ mb: 2 }}
                />
               <TextField
                  fullWidth
                  label="Date Hired"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={formatDate(selectedStaff.DateHired)}
                  sx={{ mb: 2 }}
                />

               <TextField
                fullWidth
                label="Daily Rate"
                variant="filled"
                InputProps={{ readOnly: true }}
                value={
                  selectedStaff.DailyRate
                    ? `₱${selectedStaff.DailyRate}`
                    : "—"
                }
                sx={{ mb: 2 }}
              />

            <TextField
              fullWidth
              label="Hourly Rate"
              variant="filled"
              InputProps={{ readOnly: true }}
              value={
                selectedStaff.HourlyRate
                  ? `₱${selectedStaff.HourlyRate}`
                  : "—"
              }
              sx={{ mb: 2 }}
            />

                <TextField
                  fullWidth
                  label="Overtime Rate"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={
                    selectedStaff.OvertimeRate
                      ? `₱${selectedStaff.OvertimeRate}`
                      : "—"
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
    </Dialog>

      {/* EDIT STAFF DIALOG */}
      <Dialog
        open={isEditStaffOpen}
        onClose={() => setEditStaffOpen(false)}
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
              <EditIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Edit Staff Details
              </Typography>
            </Box>
            <IconButton
              onClick={() => setEditStaffOpen(false)}
              sx={{
                "&:hover": { color: theme.palette.error.main },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 4 }}>
          {selectedStaff && (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 4 }}>
              <Grid container spacing={3}>
                {/* LEFT COLUMN */}
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <BadgeIcon color="primary" /> Personal Information
                  </Typography>
                  <TextField
                    fullWidth
                    label="Full Name"
                    variant="filled"
                    value={selectedStaff.FullName || ""}
                    onChange={(e) =>
                      setSelectedStaff((prev) => ({ ...prev, FullName: e.target.value }))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    variant="filled"
                    value={selectedStaff.Email || ""}
                    onChange={(e) =>
                      setSelectedStaff((prev) => ({ ...prev, Email: e.target.value }))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Phone"
                    variant="filled"
                    value={selectedStaff.Phone || ""}
                    onChange={(e) =>
                      setSelectedStaff((prev) => ({ ...prev, Phone: e.target.value }))
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Role"
                    variant="filled"
                    value={selectedStaff.Role || ""}
                    onChange={(e) =>
                      setSelectedStaff((prev) => ({ ...prev, Role: e.target.value }))
                    }
                    sx={{ mb: 2 }}
                  />

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mt: 3,
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <NotesIcon color="primary" /> Notes
                  </Typography>
                  <TextField
                    fullWidth
                    label="Notes"
                    variant="filled"
                    multiline
                    rows={3}
                    value={selectedStaff.Notes || ""}
                    onChange={(e) =>
                      setSelectedStaff((prev) => ({ ...prev, Notes: e.target.value }))
                    }
                  />
                </Grid>

                {/* RIGHT COLUMN */}
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <BusinessIcon color="primary" /> Work Information
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Branches</InputLabel>
                    <Select
                      label="Branches"
                      multiple
                      value={selectedStaff.BranchIDs || []}
                      onChange={(e) =>
                        setSelectedStaff((prev) => ({ ...prev, BranchIDs: e.target.value }))
                      }
                    >
                      {branchOptions
                        .filter((b) => b.value !== "all")
                        .map((branch) => (
                          <MenuItem key={branch.value} value={branch.value}>
                            {branch.label}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Date Hired"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    variant="filled"
                    value={selectedStaff.DateHired || ""}
                    onChange={(e) =>
                      setSelectedStaff((prev) => ({ ...prev, DateHired: e.target.value }))
                    }
                    sx={{ mb: 2 }}
                  />

                  {/* Daily Rate */}
                  <TextField
                    fullWidth
                    label="Daily Rate"
                    type="number"
                    variant="filled"
                    value={selectedStaff.DailyRate || 0}
                    onChange={(e) =>
                      setSelectedStaff((prev) => ({
                        ...prev,
                        DailyRate: e.target.value,
                      }))
                    }
                    sx={{ mb: 2 }}
                  />

                  {/* Derived Hourly & Overtime (read-only) */}
                  <TextField
                    fullWidth
                    label="Hourly Rate (auto)"
                    variant="filled"
                    value={clientHourly}
                    helperText="Derived from DailyRate / 8"
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Overtime Rate (auto)"
                    variant="filled"
                    value={clientOvertime}
                    helperText="Hourly × 1.25"
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "flex-end", gap: 2, py: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleEditStaffSubmit}
            sx={{
              px: 4,
              py: 1,
              fontSize: "1rem",
              fontWeight: "bold",
              borderRadius: 2,
              textTransform: "none",
            }}
            startIcon={<SaveIcon />}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW ATTENDANCE */}
      <Dialog
        open={isViewAttendanceOpen}
        onClose={() => setViewAttendanceOpen(false)}
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarMonthIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Attendance Details
              </Typography>
            </Box>
            <IconButton
              onClick={() => setViewAttendanceOpen(false)}
              sx={{ "&:hover": { color: theme.palette.error.main } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 4 }}>
          {selectedAttendance && (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <BadgeIcon color="primary" /> Attendance Info
                  </Typography>

                  <TextField
                    fullWidth
                    label="Attendance ID"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedAttendance.AttendanceID || "—"}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Staff Name"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={
                      selectedAttendance.staff
                        ? selectedAttendance.staff.FullName
                        : "—"
                    }
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Date"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={
                      selectedAttendance.Date
                        ? formatDate(selectedAttendance.Date)
                        : "—"
                    }
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Night Diff Hours"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={
                      selectedAttendance.NightDiffHours != null
                        ? selectedAttendance.NightDiffHours
                        : 0
                    }
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Late Minutes"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={
                      selectedAttendance.LateMinutes != null
                        ? selectedAttendance.LateMinutes
                        : 0
                    }
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <AccessTimeIcon color="primary" /> Work Hours
                  </Typography>

                  <TextField
                    fullWidth
                    label="Time In"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedAttendance.TimeIn || "—"}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Time Out"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedAttendance.TimeOut || "—"}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Hours Worked"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={
                      selectedAttendance.HoursWorked != null
                        ? selectedAttendance.HoursWorked
                        : 0
                    }
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Overtime Hours"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={
                      selectedAttendance.OvertimeHours != null
                        ? selectedAttendance.OvertimeHours
                        : 0
                    }
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>


      {/* EDIT ATTENDANCE */}
      <Dialog
  open={isEditAttendanceOpen}
  onClose={() => setEditAttendanceOpen(false)}
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
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <EditIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Edit Attendance
        </Typography>
      </Box>
      <IconButton
        onClick={() => setEditAttendanceOpen(false)}
        sx={{
          "&:hover": { color: theme.palette.error.main },
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>
  </DialogTitle>

  <DialogContent dividers sx={{ p: 4 }}>
    {selectedAttendance && (
      <Box sx={{ display: "flex", flexDirection: "row", gap: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <BadgeIcon color="primary" /> Attendance Info
            </Typography>

            <TextField
              fullWidth
              label="Attendance ID"
              variant="outlined"
              disabled
              value={selectedAttendance.AttendanceID || "—"}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Staff Name"
              variant="outlined"
              disabled
              value={
                selectedAttendance.staff
                  ? selectedAttendance.staff.FullName
                  : "—"
              }
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Date"
              type="date"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={selectedAttendance.Date || ""}
              onChange={(e) =>
                setSelectedAttendance((prev) => ({
                  ...prev,
                  Date: e.target.value,
                }))
              }
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Night Diff Hours"
              type="number"
              variant="outlined"
              value={selectedAttendance.NightDiffHours || 0}
              onChange={(e) =>
                setSelectedAttendance((prev) => ({
                  ...prev,
                  NightDiffHours: parseFloat(e.target.value) || 0,
                }))
              }
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Late Minutes"
              type="number"
              variant="outlined"
              value={selectedAttendance.LateMinutes || 0}
              onChange={(e) =>
                setSelectedAttendance((prev) => ({
                  ...prev,
                  LateMinutes: parseInt(e.target.value) || 0,
                }))
              }
              sx={{ mb: 2 }}
            />
          </Grid>

          <Grid item xs={6}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <AccessTimeIcon color="primary" /> Work Hours
            </Typography>

            <TextField
              fullWidth
              label="Time In"
              type="time"
              variant="outlined"
              value={selectedAttendance.TimeIn || ""}
              onChange={(e) => {
                let val = e.target.value; // e.g. "13:00"
                // If it has length 5 => "HH:MM" => append ":00"
                if (val && val.length === 5) {
                  val += ":00";  // => "13:00:00"
                }
                setSelectedAttendance((prev) => ({
                  ...prev,
                  TimeIn: val,
                }));
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Time Out"
              type="time"
              variant="outlined"
              value={selectedAttendance.TimeOut || ""}
              onChange={(e) => {
                let val = e.target.value; // e.g. "13:00"
                // If it has length 5 => "HH:MM" => append ":00"
                if (val && val.length === 5) {
                  val += ":00";  // => "13:00:00"
                }
                setSelectedAttendance((prev) => ({
                  ...prev,
                  TimeOut: val,
                }));
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Hours Worked"
              type="number"
              variant="outlined"
              value={selectedAttendance.HoursWorked || 0}
              onChange={(e) =>
                setSelectedAttendance((prev) => ({
                  ...prev,
                  HoursWorked: parseFloat(e.target.value) || 0,
                }))
              }
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Overtime Hours"
              type="number"
              variant="outlined"
              value={selectedAttendance.OvertimeHours || 0}
              onChange={(e) =>
                setSelectedAttendance((prev) => ({
                  ...prev,
                  OvertimeHours: parseFloat(e.target.value) || 0,
                }))
              }
              sx={{ mb: 2 }}
            />
          </Grid>
        </Grid>
      </Box>
    )}
  </DialogContent>

  <DialogActions sx={{ justifyContent: "flex-end", gap: 2, py: 2 }}>
    <Button
      variant="contained"
      color="primary"
      onClick={handleEditAttendanceSubmit}
      sx={{
        px: 4,
        py: 1,
        fontSize: "1rem",
        fontWeight: "bold",
        borderRadius: 2,
        textTransform: "none",
      }}
      startIcon={<SaveIcon />}
    >
      Save Changes
    </Button>
  </DialogActions>
      </Dialog>


      {/* VIEW PAYROLL */}
      <Dialog
        open={isViewPayrollOpen}
        onClose={() => setViewPayrollOpen(false)}
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
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "1.6rem",
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <ReceiptLongIcon sx={{ fontSize: 32, color: "primary.main" }} />
          Payroll Details
        </DialogTitle>

        <DialogContent dividers>
          {selectedPayroll && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Basic Payroll Info */}
              <TextField
                label="Staff Name"
                InputProps={{ readOnly: true }}
                value={selectedPayroll.staff?.FullName ?? "—"}
              />
              <TextField
                label="Pay Period"
                InputProps={{ readOnly: true }}
                value={`${formatDate(selectedPayroll.StartDate)} - ${formatDate(
                  selectedPayroll.EndDate
                )}`}
              />
              <TextField
                label="Gross Pay"
                value={`₱${parseFloat(selectedPayroll.GrossPay || 0).toFixed(2)}`}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Deductions"
                value={`₱${parseFloat(selectedPayroll.Deductions || 0).toFixed(2)}`}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Net Pay"
                value={`₱${parseFloat(selectedPayroll.NetPay || 0).toFixed(2)}`}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Status"
                value={selectedPayroll.Status || "—"}
                InputProps={{ readOnly: true }}
              />

              {/* Show computed_attendances details if any */}
              {selectedPayroll.computed_attendances &&
                selectedPayroll.computed_attendances.length > 0 && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      border: "1px solid #ccc",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Attendance Records
                    </Typography>

                    {selectedPayroll.computed_attendances.map((att) => (
                      <Box
                        key={att.AttendanceID}
                        sx={{
                          mb: 2,
                          p: 2,
                          border: "1px solid #eee",
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                          Date: {att.Date}
                        </Typography>
                        <Typography variant="body2">
                          Hours: {att.HoursWorked} | OT: {att.OvertimeHours} | ND:{" "}
                          {att.NightDiffHours} | Late: {att.LateMinutes} min
                        </Typography>

                        {/* If you manually attached schedule property in the controller */}
                        {att.schedule ? (
                          <Typography variant="body2">
                            Schedule: {att.schedule.ShiftStart} - {att.schedule.ShiftEnd}{" "}
                            ({att.schedule.ShiftType})
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: "gray" }}>
                            No schedule
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="contained" onClick={handlePrintPayslip}>
            Print Payslip
          </Button>
          <Button variant="outlined" onClick={() => setViewPayrollOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>


      {/* EDIT PAYROLL */}
      <Dialog
        open={isEditPayrollOpen}
        onClose={() => setEditPayrollOpen(false)}
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
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "1.6rem",
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <EditIcon sx={{ fontSize: 32, color: "primary.main" }} />
          Edit Payroll
        </DialogTitle>
        <DialogContent>
            {selectedPayroll && (
              <EditPayrollForm
                payroll={selectedPayroll}
                onClose={() => setEditPayrollOpen(false)}
                onSubmit={(editedData) => {
                  setSelectedPayroll(editedData);
                  handleEditPayrollSubmit(editedData);
                }}
              />
            )}
          </DialogContent>
      </Dialog>


      {/* VIEW TASK */}
      <Dialog
        open={isViewTaskOpen}
        onClose={() => setViewTaskOpen(false)}
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
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "1.6rem",
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <AssignmentIcon sx={{ fontSize: 32, color: "primary.main" }} />
          Task Details
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {selectedTask && (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <ListAltIcon color="primary" /> Task Information
                  </Typography>
                  <TextField
                    fullWidth
                    label="Task ID"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedTask.TaskID || "—"}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Staff ID"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedTask.StaffID || "—"}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Task Date"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedTask.TaskDate || "—"}
                    sx={{ mb: 2 }}
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <DescriptionIcon color="primary" /> Task Details
                  </Typography>
                  <TextField
                    fullWidth
                    label="Description"
                    variant="filled"
                    multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                    value={selectedTask.TaskDescription || "No description available."}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Status"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={selectedTask.Status || "—"}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", p: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setViewTaskOpen(false)}
            sx={{
              px: 4,
              py: 1,
              fontSize: "1rem",
              fontWeight: "bold",
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT TASK */}
      <Dialog
        open={isEditTaskOpen}
        onClose={() => setEditTaskOpen(false)}
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
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "1.6rem",
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <EditIcon sx={{ fontSize: 32, color: "primary.main" }} />
          Edit Task
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {selectedTask && (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <ListAltIcon color="primary" /> Task Information
                  </Typography>
                  <TextField
                    fullWidth
                    label="Task ID"
                    variant="filled"
                    disabled
                    value={selectedTask.TaskID || "—"}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Staff ID"
                    variant="outlined"
                    value={selectedTask.StaffID}
                    onChange={(e) => setSelectedTask((prev) => ({ ...prev, StaffID: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Task Date"
                    type="date"
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    value={selectedTask.TaskDate}
                    onChange={(e) => setSelectedTask((prev) => ({ ...prev, TaskDate: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <DescriptionIcon color="primary" /> Task Details
                  </Typography>
                  <TextField
                    fullWidth
                    label="Description"
                    variant="outlined"
                    multiline
                    rows={3}
                    value={selectedTask.TaskDescription}
                    onChange={(e) => setSelectedTask((prev) => ({ ...prev, TaskDescription: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Status"
                    variant="outlined"
                    value={selectedTask.Status}
                    onChange={(e) => setSelectedTask((prev) => ({ ...prev, Status: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", p: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setEditTaskOpen(false)}
            sx={{
              px: 4,
              py: 1,
              fontSize: "1rem",
              fontWeight: "bold",
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleEditTaskSubmit}
            sx={{
              px: 4,
              py: 1,
              fontSize: "1rem",
              fontWeight: "bold",
              borderRadius: 2,
              textTransform: "none",
              ml: 2,
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

   
      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontWeight: "bold",
          }}
        >
          <DeleteForeverIcon color="error" />
          Confirm Deletion
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete this record? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: "gray" }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
        <Snackbar
              open={snackOpen}
              autoHideDuration={3000}
              onClose={() => setSnackOpen(false)}
              message={snackMessage}
            />
    </Box>
  );


  function EditPayrollForm({ payroll, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
      PayrollID:     payroll.PayrollID,
      StaffID:       payroll.StaffID,
      StartDate:     payroll.StartDate || "",
      EndDate:       payroll.EndDate || "",
      Deductions:    payroll.Deductions ?? 0,  // user sees the "manual" portion
      CashAdvance:   payroll.CashAdvance ?? 0,
      GrossPay:      payroll.GrossPay ?? 0,
      NetPay:        payroll.NetPay ?? 0,
      GeneratedDate: payroll.GeneratedDate || "",
      Status:        payroll.Status || "Pending",
    });
  
    // If user manually edits NetPay, we stop auto-calculation
    const [overrideNetPay, setOverrideNetPay] = useState(false);
  
    /**
     * Auto-calc NetPay = GrossPay - (Deductions + CashAdvance)
     * if user hasn't manually overridden NetPay.
     */
    const recalcNetPay = (draft) => {
      const gross = parseFloat(draft.GrossPay) || 0;
      const ded   = parseFloat(draft.Deductions) || 0;
      const cash  = parseFloat(draft.CashAdvance) || 0;
      draft.NetPay = (gross - (ded + cash)).toFixed(2);
    };
  
    /**
     * Handle changes:
     *  - If user changes NetPay => set overrideNetPay = true
     *  - Otherwise, if user changes Deductions/CashAdvance/GrossPay,
     *    recalc NetPay automatically (unless we've overridden).
     */
    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => {
        const draft = { ...prev, [name]: value };
  
        if (name === "NetPay") {
          setOverrideNetPay(true);
        }
  
        if (!overrideNetPay && ["Deductions", "CashAdvance", "GrossPay"].includes(name)) {
          recalcNetPay(draft);
        }
  
        return draft;
      });
    };
  
    /**
     * Build final payload. We always send GrossPay & NetPay,
     * plus user-typed Deductions. The back end lumps late penalty.
     */
    const handleSubmit = () => {
      // Basic check
      if (!formData.StartDate || !formData.EndDate) {
        alert("Please provide valid start/end dates.");
        return;
      }
  
      const payload = {
        PayrollID:     formData.PayrollID,
        StaffID:       formData.StaffID,
        StartDate:     formData.StartDate,
        EndDate:       formData.EndDate,
  
        // We always pass these
        GrossPay:    parseFloat(formData.GrossPay) || 0,
        NetPay:      parseFloat(formData.NetPay)   || 0,
  
        Deductions:  parseFloat(formData.Deductions) || 0,
        CashAdvance: parseFloat(formData.CashAdvance) || 0,
  
        GeneratedDate: formData.GeneratedDate || "",
        Status:        formData.Status,
      };
      
      onSubmit(payload);
    };
  
    return (
      <Card sx={{ maxWidth: 600, margin: "0 auto", p: 2 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Edit Payroll
          </Typography>
  
          {/* Payroll Date Range */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }} gutterBottom>
              Payroll Range
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="StartDate"
                  label="Start Date"
                  type="date"
                  value={formData.StartDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="EndDate"
                  label="End Date"
                  type="date"
                  value={formData.EndDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
  
          {/* Pay Details */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }} gutterBottom>
              Pay Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="GrossPay"
                  label="Gross Pay"
                  type="number"
                  value={formData.GrossPay}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="Deductions"
                  label="Deductions"
                  type="number"
                  value={formData.Deductions}
                  onChange={handleChange}
                  helperText="Manual portion. Late penalty will be added automatically by the server."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="CashAdvance"
                  label="Cash Advance"
                  type="number"
                  value={formData.CashAdvance}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="NetPay"
                  label="Net Pay"
                  type="number"
                  value={formData.NetPay}
                  onChange={handleChange}
                  helperText="Gross Pay − (Deductions + Cash Advance)"
                />
              </Grid>
            </Grid>
          </Box>
  
          {/* Other Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }} gutterBottom>
              Other Info
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="GeneratedDate"
                  label="Generated Date"
                  type="date"
                  value={formData.GeneratedDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="Status"
                  label="Status"
                  value={formData.Status}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </Box>
  
          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button onClick={handleSubmit} variant="contained">
              Save Changes
            </Button>
            <Button onClick={onClose} variant="outlined">
              Cancel
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }
  
}



