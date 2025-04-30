import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  IconButton,
  Divider,
  InputAdornment,
  OutlinedInput,
  useTheme,
  CircularProgress,
  Fab,
  Zoom,
  Alert,
  Snackbar
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import ReceiptIcon from "@mui/icons-material/Receipt";
import DescriptionIcon from "@mui/icons-material/Description";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongRounded";
import DeleteIcon from "@mui/icons-material/Delete";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import ReplayCircleFilledIcon from "@mui/icons-material/ReplayCircleFilled";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import EventIcon from "@mui/icons-material/Event";
import PaymentIcon from "@mui/icons-material/Payment";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import InfoIcon from "@mui/icons-material/Info";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BarChartIcon from "@mui/icons-material/BarChart";
import { AttachMoney } from "@mui/icons-material";

import jsPDF from "jspdf";
import "jspdf-autotable";
import dayjs from "dayjs";
import { CSVLink } from "react-csv";



export default function PaymentsAndInvoices() {
  const theme = useTheme();

  // ==================== State Hooks ====================


  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staff, setStaff] = useState(null);

  // For unfiltered data from server
  const [allPayments, setAllPayments] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [selectedDetailDate, setSelectedDetailDate] = useState(() => {
    // Get current date in Manila time (UTC+8)
    const manilaDate = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
    return manilaDate.toISOString().split('T')[0];
  });

  useEffect(() => {
    async function fetchStaffInfo() {
      try {
        const res = await axios.get("/staff/authuser");
        const staffData = res.data;
        setStaff(staffData);

        // If the staff user has a DefaultBranchID, set that as our `branch`.
        if (staffData.DefaultBranchID) {
          setBranch(staffData.DefaultBranchID.toString());
        } else {
          // If no default, you might fallback to "all" or the first branch in your dropdown
          setBranch("all");
        }
      } catch (error) {
        console.error("Error fetching staff info:", error);
        // handle error: possibly show an error message or redirect
      } finally {
        setLoadingStaff(false);
      }
    }

    fetchStaffInfo();
  }, []);


  // For filtered data displayed in the table
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);

    // For petty
  const [pettyDialogOpen, setPettyDialogOpen] = useState(false);
  const [selectedFlowRow, setSelectedFlowRow] = useState(null); // store the row user clicked
  const [pettyForm, setPettyForm] = useState({
    pettyCash: '',
    pettyTomorrow: '',
  });


  // Active tab, search, and branch
  const [activeTab, setActiveTab] = useState(2);
  const [searchTerm, setSearchTerm] = useState("");
  const [branch, setBranch] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);

  // Date range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Payment and Invoice references
  const [members, setMembers] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);

  // Delete logic
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState("");
  const [deleteItemId, setDeleteItemId] = useState(null);

  // Payment dialogs
  const [isAddPaymentOpen, setAddPaymentOpen] = useState(false);
  const [isEditPaymentOpen, setEditPaymentOpen] = useState(false);
  const [isViewPaymentOpen, setViewPaymentOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("");

  const [newPayment, setNewPayment] = useState({
    memberId: "",
    walkInName: "",
    bookingRef: "",
    sessionRef: "",
    paymentDate: "",
    amountPaid: 0,
    method: "",
    status: "Pending",
    note: "",
  });
  const [editPayment, setEditPayment] = useState({});
  const [viewPayment, setViewPayment] = useState(null);

  // Partial Payment Dialog
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [partialPayment, setPartialPayment] = useState({
    memberId: "",
    paymentDate: "",
    method: "",
    amount: 0,
    status: "Pending",
    allocatedInvoices: [],
  });

  // Invoice dialogs
  const [isAddInvoiceOpen, setAddInvoiceOpen] = useState(false);
  const [isEditInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [isViewInvoiceOpen, setViewInvoiceOpen] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    memberId: "",
    invoiceDate: "",
    dueDate: "",
    invoiceTotal: 0,
    status: "",
  });
  const [editInvoice, setEditInvoice] = useState({});
  const [viewInvoice, setViewInvoice] = useState(null);

  const [gymCashFlows, setGymCashFlows] = useState([]);
  const [filteredGymSales, setFilteredGymSales] = useState([]);

  // Confirmation dialog
  const [openConfirmation, setOpenConfirmation] = useState(false);

  // Export menu
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteData, setNoteData] = useState({
    paymentId: null,
    note: '',
  });

  // Payment type selection menu
  const [paymentMenuAnchorEl, setPaymentMenuAnchorEl] = useState(null);

  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info", // 'success', 'error', 'warning', 'info'
  });

  // ==================== Utility/Helper Functions ====================
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

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (value) => {
    if (value == null || value === "") return "—";
    return `₱${parseInt(value).toLocaleString("en-PH")}`;
  };

  function formatCurrencyCell(params) {
    if (!params.value) return '—';
    return '₱' + Number(params.value).toLocaleString();
  }

      // somewhere above your component:
    function filterSalesByDateRange(rows, fromDate, toDate) {
      if (!fromDate && !toDate) return rows;
      const start = fromDate ? new Date(fromDate) : null;
      const end = toDate ? new Date(toDate) : null;

      return rows.filter((row) => {
        // If row has row.date in 'YYYY-MM-DD' format:
        const d = new Date(row.date);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }
  

  // Payment-date filter for payments
  function filterPaymentsByDate(payments, start, end) {
    if (!start && !end) return payments;
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return payments.filter((p) => {
      const d = new Date(p.paymentDate); // specifically PaymentDate
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  }

  // Invoice-date filter for invoices
  function filterInvoicesByDate(invoices, start, end) {
    if (!start && !end) return invoices;
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return invoices.filter((inv) => {
      const d = new Date(inv.invoiceDate); // specifically InvoiceDate
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  }

  function groupPaymentsByPaymentFor(payments) {
    // This returns something like:
    // {
    //   "Walk-in Payment": [
    //     { payerName: "Alice", cash: 350, gcash: 0, bpi: 0, bdo: 0, total: 350 },
    //     { payerName: "Jakes", cash: 0, gcash: 350, bpi: 0, bdo: 0, total: 350 },
    //     ...
    //   ],
    //   "New Membership": [...],
    //   "Membership Renewal": [...]
    // }
  
    const result = {};
  
    payments.forEach((pay) => {
      // pay.paymentFor could be multiple categories if it's an array
      // Typically 1-element array like ["Walk-in Payment"] 
      // so we map over each category in there
      (pay.paymentFor || []).forEach((category) => {
        const normalizedCategory = category.trim();
  
        // If we only care about the Gym categories, skip anything else
        // or you can keep them all
        if (!result[normalizedCategory]) {
          result[normalizedCategory] = [];
        }
  
        // Normalize the method
        const method = normalizePaymentMethod(pay.method);
        // Prepare a row object with all method columns = 0
        const row = {
          paymentId: pay.paymentId,      // store PaymentID
          payerName: pay.payerName || pay.walkInName || "N/A",
          note: pay.note || "",     
          cash: 0,
          gcash: 0,
          bpi: 0,
          bdo: 0,
          total: 0,
        };
  
        // Put the amount in the right column
        switch (method) {
          case "Cash":
            row.cash = pay.amountPaid;
            break;
          case "GCash":
            row.gcash = pay.amountPaid;
            break;
          case "BPI":
            row.bpi = pay.amountPaid;
            break;
          case "BDO":
            row.bdo = pay.amountPaid;
            break;
          default:
            // If you want to track others
            break;
        }
        row.total = pay.amountPaid;
  
        result[normalizedCategory].push(row);
      });
    });
  
    return result;
  }
  

  // The main "handleFilterData" function
  const handleFilterData = () => {
    // 1) Filter payments by PaymentDate
    const dateFilteredPayments = filterPaymentsByDate(allPayments, dateFrom, dateTo);

    // 2) Filter invoices by InvoiceDate
    const dateFilteredInvoices = filterInvoicesByDate(allInvoices, dateFrom, dateTo);

    // 3) Then filter by branch
    const branchFilteredPayments =
      branch === "all"
        ? dateFilteredPayments
        : dateFilteredPayments.filter((p) => p.branchId === branch);

    const branchFilteredInvoices =
      branch === "all"
        ? dateFilteredInvoices
        : dateFilteredInvoices.filter((inv) => inv.branchId === branch);

    // 4) Then filter by searchTerm
    const searchStr = searchTerm.toLowerCase();
    const textFilteredPayments = branchFilteredPayments.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchStr)
    );
    const textFilteredInvoices = branchFilteredInvoices.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchStr)
    );

    // 5) Set final arrays
    setFilteredPayments(textFilteredPayments);
    setFilteredInvoices(textFilteredInvoices);
  };

  // 2) PaymentFor categories we want to count
  const PAYMENT_FOR_TYPES = [
    "New Membership",
    "Monthly Client Fee",
    "Walk-in Payment",
    "Membership Renewal",
    "Booking",
    "CoachingSessionBooking",
  ];

  // ==================== useEffect Fetch Calls ====================
  useEffect(() => {
    async function fetchData() {
      await Promise.all([
        fetchMembers(),
        fetchBranches(),
        fetchAllPayments(),
        fetchAllInvoices(),
        fetchUnpaidInvoices(),
        fetchGymCashFlow()
      ]);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    handleFilterData();
  }, [searchTerm, dateFrom, dateTo, branch]);
  
  useEffect(() => {
    if (activeTab === 2) {
      // 1) Filter gymFlows by branch
      const filteredFlows =
        branch === "all"
          ? gymCashFlows
          : gymCashFlows.filter((flow) => flow.BranchID?.toString() === branch);
  
      // 2) Filter allPayments by branch
      const filteredPayments =
        branch === "all"
          ? allPayments
          : allPayments.filter((p) => p.branchId === branch);
  
      // 3) Aggregate
      const aggregated = aggregateByDate(filteredFlows, filteredPayments);
  
      // 4) Then still apply your existing date-range filter
      const dateFiltered = filterSalesByDateRange(aggregated, dateFrom, dateTo);
      setFilteredGymSales(dateFiltered);
    }
  }, [activeTab, gymCashFlows, allPayments, dateFrom, dateTo, branch]);
  

  // 1) MEMBERS
  const fetchMembers = async () => {
    try {
      const res = await axios.get("/membership/members");
      const data = Array.isArray(res.data) ? res.data : res.data.members || [];
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2) BRANCHES
  const fetchBranches = async () => {
    try {
      const res = await axios.get("/owner/branches");
      const data = res.data.branches.map((b) => ({
        value: b.BranchID.toString(),
        label: b.BranchName,
      }));
      setBranchOptions([{ value: "all", label: "All Branches" }, ...data]);
    } catch (err) {
      console.error(err);
      setBranchOptions([{ value: "all", label: "All Branches" }]);
    }
  };
  

  async function fetchAllPayments() {
    try {
      const res = await axios.get("/payments");
      const mapped = res.data.map((p) => ({
        paymentId: p.PaymentID,
        memberId: p.MemberID ? p.MemberID.toString() : "",
        monthlyClientId: p.MonthlyClientID ? p.MonthlyClientID.toString() : "",
        payerName:
          p.PayerName ??
          p.member?.FullName ??
          p.monthly_client?.FullName ??
          p.WalkInName ??
          "N/A",
        // Store the raw PaymentDate => "2025-03-14 03:12:26"
        paymentDate: p.PaymentDate,
        amountPaid: Number(p.Amount),
        method: p.PaymentMethod,
        status: p.Status,
        branchId: p.BranchID ? p.BranchID.toString() : "",
        // Parse JSON string if needed
        paymentFor: typeof p.PaymentFor === 'string' 
          ? JSON.parse(p.PaymentFor) 
          : (Array.isArray(p.PaymentFor) ? p.PaymentFor : []),
        note: p.Note,
      }));
      setAllPayments(mapped);
      setFilteredPayments(mapped);
    } catch (err) {
      console.error(err);
    }
  }

  

  const fetchAllInvoices = async () => {
    try {
      const res = await axios.get("/invoices");
      const mapped = res.data.map((inv) => ({
        invoiceId: inv.InvoiceID,
        memberId: inv.MemberID ? inv.MemberID.toString() : "",
        // Use member name if available, otherwise try monthly_client
        memberName: inv.member?.FullName ?? inv.monthly_client?.FullName ?? "N/A",
        invoiceDate: inv.InvoiceDate,
        dueDate: inv.DueDate,
        invoiceTotal: inv.InvoiceTotal,
        status: inv.PaymentStatus,
        branchId: inv.BranchID ? inv.BranchID.toString() : "",
      }));
      setAllInvoices(mapped);
      setFilteredInvoices(mapped);
    } catch (err) {
      console.error(err);
    }
  };
  
  

  // 5) UNPAID
  const fetchUnpaidInvoices = async () => {
    try {
      const res = await axios.get("/invoices?status=unpaid_or_partial");
      const mapped = (res.data || []).map((inv) => ({
        invoiceId: inv.InvoiceID,
        invoiceTotal: inv.InvoiceTotal,
        paymentStatus: inv.PaymentStatus,
        memberName: inv.member ? inv.member.FullName : "N/A",
      }));
      setUnpaidInvoices(mapped);
    } catch (err) {
      console.error(err);
    }
  };

    // Example fetch for daily cash flows (Gym) - or you can fetch *all* flows and filter
    const fetchGymCashFlow = async () => {
      try {
        const res = await axios.get("/finance/cashflow");
        let flows = res.data.flows || [];
        // Filter to only Gym
        flows = flows.filter((f) => f.BusinessType === "Gym");
        setGymCashFlows(flows);
      } catch (err) {
        console.error(err);
      }
    };

  // ==================== Delete Logic ====================
  function handleOpenDeleteDialog(type, id) {
    setDeleteType(type);
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  }

  function openPettyDialog(row) {
    // Save the entire row so we know which date/Flow to update
    setSelectedFlowRow(row);
  
    // Pre-fill pettyForm with existing values
    setPettyForm({
      pettyCash: row.pettyCash?.toString() || '',
      pettyTomorrow: row.pettyTomorrow?.toString() || '',
    });
  
    setPettyDialogOpen(true);
  }

  async function handleSubmitPetty() {
    if (!selectedFlowRow) return;
  
    // Debug: see what we have
    console.log("selectedFlowRow:", selectedFlowRow);
  
    try {
      // Provide fallback or real values for the missing fields:
      const payload = {
        // If selectedFlowRow has no BranchID, you could fallback to staff's branch or 1
        BranchID: selectedFlowRow.BranchID ?? 1,
        
        // The backend expects 'Date', but your row has 'date' (lowercase):
        Date: selectedFlowRow.date ?? dayjs().format("YYYY-MM-DD"),
  
        // If your DB column is BusinessType, you can default it or store it somewhere:
        BusinessType: selectedFlowRow.BusinessType ?? "Gym",
  
        // The actual petty-cash fields you're updating:
        PettyCash: Number(pettyForm.pettyCash) || 0,
        PettyCashTomorrow: Number(pettyForm.pettyTomorrow) || 0,
      };
  
      console.log("Payload =>", payload);
  
      await axios.put(`/finance/cashflow/${selectedFlowRow.CashFlowID}`, payload);
  
      alert("Petty cash updated successfully!");
      await fetchGymCashFlow(); // Refresh
      setPettyDialogOpen(false);
      setSelectedFlowRow(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update petty cash");
    }
  }
  
  const handleDeleteConfirm = async () => {
    setLoading(true);
    try {
      if (deleteType === "payment") {
        await axios.delete(`/payments/${deleteItemId}`);
      } else if (deleteType === "invoice") {
        await axios.delete(`/invoices/${deleteItemId}`);
      }
      
      // Refresh all relevant data after deletion
      await Promise.all([
        fetchAllPayments(),
        fetchGymCashFlow(),
        fetchAllInvoices(),
        fetchUnpaidInvoices()
      ]);
      
      // Close dialog after data is refreshed
      handleCloseDeleteDialog();
      setSnackbar({
        open: true,
        message: `${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deleted successfully!`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting:", error);
      setSnackbar({
        open: true,
        message: `Error deleting ${deleteType}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  function handleCloseDeleteDialog() {
    setDeleteDialogOpen(false);
    setDeleteType("");
    setDeleteItemId(null);
  }

  function getDeleteMessage() {
    if (deleteType === "payment") {
      return "Are you sure you want to delete this Payment? This action cannot be undone. If this payment is the only one linked to its invoice, the invoice will also be deleted.";
    }
    if (deleteType === "invoice") {
      return "Are you sure you want to delete this Invoice? This action cannot be undone.";
    }
    return "Are you sure you want to delete this record? This action cannot be undone.";
  }

  function normalizePaymentMethod(method) {
    if (!method) return "Cash"; // Default to Cash if no method specified
    const lower = method.toLowerCase();
  
    // Check if the method contains any of the standard payment methods
    if (lower.includes("gcash")) {
      return "GCash";
    } else if (lower.includes("bpi")) {
      return "BPI";
    } else if (lower.includes("bdo")) {
      return "BDO";
    } else if (lower.includes("cash") || lower === "cash") {
      return "Cash";
    } else {
      return "Cash"; // Default to Cash for any unrecognized method
    }
  }
  
  // Function to handle closing the snackbar
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };
  
  
  // ==================== Aggregation for Gym Cash Flows + Payments ====================
  function aggregateByDate(gymFlows, allPayments) {
    const resultsMap = {};
  
    // 1) Process daily flows
    gymFlows.forEach((flow) => {
      const dateStr = flow.Date; // e.g., "2025-03-14"
      if (!resultsMap[dateStr]) {
        resultsMap[dateStr] = {
          CashFlowID: flow.CashFlowID,
          date: dateStr,
  
          // "raw" payment totals from the flow (no petty factoring)
          rawCash: 0,
          rawGCash: 0,
          rawBPI: 0,
          rawBDO: 0,
  
          // Petty cash today / tomorrow
          pettyCash: 0,
          pettyTomorrow: 0,
  
          // Counters for "PaymentFor" categories (optional)
          countNewMembership: 0,
          countMonthlyClientFee: 0,
          countWalkinPayment: 0,
          countMembershipRenewal: 0,
          countBooking: 0,
          countCoachingSessionBooking: 0,
  
          // We will calculate these below
          totalSales: 0,
          takeHome: 0,
          cashPlusPetty: 0,               // <--- NEW
          cashPlusPettyMinusTomorrow: 0,  // <--- NEW
        };
      }
  
      // Summation of Cash, GCash, etc. from flow
      const sumCash = parseFloat(flow.CashSales || 0) + parseFloat(flow.WalkInCashSales || 0);
      const sumGCash = parseFloat(flow.GCashSales || 0) + parseFloat(flow.WalkInGCashSales || 0);
      const sumBPI  = parseFloat(flow.BPISales || 0) + parseFloat(flow.WalkInBPISales || 0);
      const sumBDO  = parseFloat(flow.BDOSales || 0) + parseFloat(flow.WalkInBDOSales || 0);
  
      resultsMap[dateStr].rawCash  += sumCash;
      resultsMap[dateStr].rawGCash += sumGCash;
      resultsMap[dateStr].rawBPI   += sumBPI;
      resultsMap[dateStr].rawBDO   += sumBDO;
  
      // PettyCash from the flow
      resultsMap[dateStr].pettyCash     = parseFloat(flow.PettyCash || 0);
      resultsMap[dateStr].pettyTomorrow = parseFloat(flow.PettyCashTomorrow || 0);
    });
  
    // 2) Process Payments that don't match an existing daily flow
    allPayments.forEach((pay) => {
      if (!pay.paymentDate) return;
      const payDateStr = pay.paymentDate.split(" ")[0];
      if (!payDateStr) return;
  
      // If we already have a flow for this day, skip to avoid double counting
      if (resultsMap[payDateStr]) {
        return;
      }
  
      // Otherwise, create a placeholder row for that date
      if (!resultsMap[payDateStr]) {
        resultsMap[payDateStr] = {
          date: payDateStr,
          rawCash: 0,
          rawGCash: 0,
          rawBPI: 0,
          rawBDO: 0,
          pettyCash: 0,
          pettyTomorrow: 0,
          countNewMembership: 0,
          countMonthlyClientFee: 0,
          countWalkinPayment: 0,
          countMembershipRenewal: 0,
          countBooking: 0,
          countCoachingSessionBooking: 0,
          totalSales: 0,
          takeHome: 0,
          cashPlusPetty: 0,              
          cashPlusPettyMinusTomorrow: 0,
        };
      }
  
      const payAmount = pay.amountPaid || 0;
      const method = normalizePaymentMethod(pay.method);
  
      switch (method) {
        case "Cash":
          resultsMap[payDateStr].rawCash += payAmount;
          break;
        case "GCash":
          resultsMap[payDateStr].rawGCash += payAmount;
          break;
        case "BPI":
          resultsMap[payDateStr].rawBPI += payAmount;
          break;
        case "BDO":
          resultsMap[payDateStr].rawBDO += payAmount;
          break;
        default:
          break;
      }
  
      // If you track PaymentFor
      if (Array.isArray(pay.paymentFor)) {
        pay.paymentFor.forEach((cat) => {
          const c = cat.trim();
          if      (c === "New Membership")         resultsMap[payDateStr].countNewMembership++;
          else if (c === "Monthly Client Fee")     resultsMap[payDateStr].countMonthlyClientFee++;
          else if (c === "Walk-In Payment")        resultsMap[payDateStr].countWalkinPayment++;
          else if (c === "Membership Renewal")     resultsMap[payDateStr].countMembershipRenewal++;
          else if (c === "Booking")                resultsMap[payDateStr].countBooking++;
          else if (c === "CoachingSessionBooking") resultsMap[payDateStr].countCoachingSessionBooking++;
        });
      }
    });
  
    // 3) Compute final totals, including your new columns
    Object.values(resultsMap).forEach((row) => {
      // totalSales = sum of all payment methods
      row.totalSales = row.rawCash + row.rawGCash + row.rawBPI + row.rawBDO;
  
      // For reference: was total of all sales + petty - tomorrow
      row.takeHome = row.totalSales + row.pettyCash - row.pettyTomorrow;
  
      // NEW columns
      row.cashPlusPetty = row.rawCash + row.pettyCash;
      row.cashPlusPettyMinusTomorrow = row.cashPlusPetty - row.pettyTomorrow;
    });
  
    // 4) Return sorted list of rows
    return Object.values(resultsMap).sort((a, b) => b.date.localeCompare(a.date));
  }
  
  // ==================== Tab Logic ====================
  const handleTabChange = (event, newValue) => {
    setActiveTab(2);
    setSearchTerm("");
  };


  function openEditNoteDialog(paymentId, currentNote) {
    setNoteData({ paymentId, note: currentNote });
    setNoteDialogOpen(true);
  }

  function closeEditNoteDialog() {
    setNoteDialogOpen(false);
    setNoteData({ paymentId: null, note: '' });
  }

  async function handleSaveNote() {
    try {
      await axios.patch(`/payments/${noteData.paymentId}/note`, {
        Note: noteData.note,
      });
  
      // Option A: fetchAllPayments() again to refresh local data
      // Option B: patch local data so we don't have to re-fetch everything
      // We'll do Option B quickly:
  
      setAllPayments((prev) =>
        prev.map((p) =>
          p.paymentId === noteData.paymentId
            ? { ...p, note: noteData.note }
            : p
        )
      );
  
      // Also update the "Detailed Breakdown" aggregator if needed
      // Probably you already recalc it from allPayments, so
      // the next time you do a setAllPayments, the aggregator sees the new note.
  
      closeEditNoteDialog();
    } catch (err) {
      console.error(err);
      alert('Failed to save note');
    }
  }

  // ==================== Table Columns ====================
  // Payment columns
  const paymentColumns = [
    {
      field: "paymentDate",
      headerName: "Payment Date",
      width: 250,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : "—", // show PaymentDate in "YYYY-MM-DD" (or local date)
    },
    {
      field: "payerName",
      headerName: "Payer",
      width: 180,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "paymentFor",
      headerName: "Payment For",
      width: 200,
      renderCell: (params) =>
        Array.isArray(params.value) && params.value.length > 0 ? params.value.join(", ") : "—",
    },
    {
      field: "amountPaid",
      headerName: "Amount Paid",
      width: 120,
      renderCell: (params) => (params.value ? formatCurrency(params.value) : "—"),
    },
    {
      field: "method",
      headerName: "Method",
      width: 110,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (params) => {
        const status = params.value ?? "—";
        let color = "#ff9800"; // Default orange
        if (status.toLowerCase() === "completed") color = "#4caf50"; // Green
        if (status.toLowerCase() === "failed" || status.toLowerCase() === "refunded") {
          color = "#f44336"; // Red
        }
        return <span style={{ color, fontWeight: "bold" }}>{status}</span>;
      },
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 250,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#4caf50", color: "#fff", minWidth: 40 }}
              onClick={() => handleViewPaymentOpen(params.row)}
            >
              <VisibilityIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#2196f3", color: "#fff", minWidth: 40 }}
              onClick={() => handleEditPaymentOpen(params.row)}
            >
              <EditIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Refund Payment">
            <Button
              variant="contained"
              color="error"
              onClick={() => handleOpenDeleteDialog("payment", params.row.paymentId)}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Invoice columns
  const invoiceColumns = [
    {
      field: "invoiceId",
      headerName: "Invoice ID",
      width: 120,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "memberName",
      headerName: "Member Name",
      width: 150,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "invoiceDate",
      headerName: "Invoice Date",
      width: 250,
      renderCell: (params) =>
        params.value ? formatDateTime(params.value) : "—", // show InvoiceDate in date-time
    },
    {
      field: "dueDate",
      headerName: "Due Date",
      width: 200,
      renderCell: (params) => (params.value ? formatDate(params.value) : "—"),
    },
    {
      field: "invoiceTotal",
      headerName: "Total",
      width: 120,
      renderCell: (params) => (params.value ? formatCurrency(params.value) : "—"),
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View Invoice + Line Items">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#4caf50", color: "#fff" }}
              onClick={() => handleViewInvoiceOpen(params.row)}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Edit Invoice">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#2196f3", color: "#fff" }}
              onClick={() => handleEditInvoiceOpen(params.row)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              variant="contained"
              color="error"
              onClick={() => handleOpenDeleteDialog("invoice", params.row.invoiceId)}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Show the filtered arrays
  const displayedRows = activeTab === 0 ? filteredPayments : filteredInvoices;
  const displayedColumns = activeTab === 0 ? paymentColumns : invoiceColumns;
  const getPaymentRowId = (row) => row.paymentId;
  const getInvoiceRowId = (row) => row.invoiceId;
  const rowIdGetter = activeTab === 0 ? getPaymentRowId : getInvoiceRowId;

  // ==================== Payment Buttons & Dialogs ====================
  const openPaymentDialog = (mode) => {
    setPaymentMode(mode);
    setNewPayment({
      memberId: "",
      walkInName: "",
      bookingRef: "",
      sessionRef: "",
      paymentDate: "",
      amountPaid: 0,
      method: "",
      status: "Pending",
      note: "",
    });
    setAddPaymentOpen(true);
  };

  const closePaymentDialog = () => {
    setAddPaymentOpen(false);
  };

  const handleAddPaymentOpen = (mode) => {
    if (mode === "partial") {
      // open partial payment dialog
      setPartialPayment({
        memberId: "",
        paymentDate: "",
        method: "",
        amount: 0,
        status: "Pending",
        allocatedInvoices: [],
      });
      setPartialDialogOpen(true);
    } else {
      openPaymentDialog(mode);
    }
  };

  // Partial Payment
  const closePartialDialog = () => {
    setPartialDialogOpen(false);
  };

  const handleSubmitPartialPayment = () => {
    const payload = {
      BranchID: branch !== "all" ? branch : (staff?.DefaultBranchID || null),
      MemberID: partialPayment.memberId ? Number(partialPayment.memberId) : null,
      PaymentFor: "Partial",
      PaymentMethod: partialPayment.method,
      Amount: Number(partialPayment.amount),
      PaymentDate: partialPayment.paymentDate,
      Status: partialPayment.status,
      allocatedInvoices: partialPayment.allocatedInvoices.map((alloc) => ({
        invoiceId: alloc.invoiceId,
        amountAllocated: Number(alloc.amountAllocated),
      })),
    };

    setLoading(true);
    
    // First close the dialog to prevent double submissions
    setPartialDialogOpen(false);
    
    axios
      .post("/payments/partial", payload)
      .then(response => {
        console.log("Partial payment success:", response);
        
        // Refresh all relevant data
        Promise.all([
          fetchAllPayments(),
          fetchGymCashFlow(),
          fetchAllInvoices(),
          fetchUnpaidInvoices()
        ])
        .then(() => {
          // Show success message after data is refreshed
          setSnackbar({
            open: true,
            message: "Partial payment created successfully!",
            severity: "success",
          });
          setLoading(false);
        })
        .catch(error => {
          console.error("Error refreshing data:", error);
          // Still show success since payment was created
          setSnackbar({
            open: true,
            message: "Partial payment created successfully, but data refresh failed. Please refresh the page.",
            severity: "warning",
          });
          setLoading(false);
        });
      })
      .catch(error => {
        console.error("Error creating partial payment:", error);
        // Reopen dialog if there was an error
        setPartialDialogOpen(true);
        setSnackbar({
          open: true,
          message: "Error creating partial payment: " + (error.response?.data?.message || error.message || "Unknown error"),
          severity: "error",
        });
        setLoading(false);
      });
  };

  const handleAddPaymentChange = (e) => {
    const { name, value } = e.target;
    setNewPayment((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPaymentSubmit = () => {
    const paymentForArr = [];
    switch (paymentMode) {
      case "booking":
        paymentForArr.push("Booking");
        break;
      case "session":
        paymentForArr.push("PT Session");
        break;
      default:
        paymentForArr.push("Others");
    }

    const payload = {
      BranchID: branch !== "all" ? branch : (staff?.DefaultBranchID || null),
      MemberID: newPayment.memberId,
      PaymentFor: paymentForArr,
      PaymentMethod: normalizePaymentMethod(newPayment.method), // Ensure method is normalized
      Amount: Number(newPayment.amountPaid),
      PaymentDate: newPayment.paymentDate,
      Status: newPayment.status || "Pending",
      BookingRef: paymentMode === "booking" ? newPayment.bookingRef : null,
      SessionRef: paymentMode === "session" ? newPayment.sessionRef : null,
      Note: newPayment.note,
    };

    setLoading(true);
    
    // First close the dialog to prevent double submissions
    setAddPaymentOpen(false);
    
    axios
      .post("/payments", payload)
      .then(response => {
        console.log("Payment success response:", response);
        
        // Refresh all relevant data
        Promise.all([
          fetchAllPayments(), 
          fetchGymCashFlow(),
          fetchAllInvoices(),
          fetchUnpaidInvoices()
        ])
        .then(() => {
          // Show success message after data is refreshed
          setSnackbar({
            open: true,
            message: "Payment added successfully!",
            severity: "success",
          });
          setLoading(false);
        })
        .catch(error => {
          console.error("Error refreshing data:", error);
          // Still show success since payment was created
          setSnackbar({
            open: true,
            message: "Payment added successfully, but data refresh failed. Please refresh the page.",
            severity: "warning",
          });
          setLoading(false);
        });
      })
      .catch(error => {
        console.error("Error adding payment:", error);
        // Reopen dialog if there was an error
        setAddPaymentOpen(true);
        setSnackbar({
          open: true,
          message: "Error adding payment: " + (error.response?.data?.message || error.message || "Unknown error"),
          severity: "error",
        });
        setLoading(false);
      });
  };

  // Payment edit / view
  const handleEditPaymentOpen = (row) => {
    setEditPayment(row);
    setEditPaymentOpen(true);
  };

  const handleEditPaymentChange = (e) => {
    const { name, value } = e.target;
    setEditPayment((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditPaymentSubmit = () => {
    const payload = {
      BranchID: editPayment.BranchID || (branch !== "all" ? branch : (staff?.DefaultBranchID || null)),
      MemberID: editPayment.memberId,
      PaymentFor: editPayment.paymentFor,
      PaymentMethod: normalizePaymentMethod(editPayment.method),
      Amount: Number(editPayment.amountPaid),
      PaymentDate: editPayment.paymentDate,
      Status: editPayment.status || "Pending",
      BookingRef: editPayment.bookingRef,
      SessionRef: editPayment.sessionRef,
      Note: editPayment.note,
    };

    setLoading(true);
    
    // First close the dialog to prevent double submissions
    setEditPaymentOpen(false);
    
    axios
      .put(`/payments/${editPayment.paymentId}`, payload)
      .then(response => {
        console.log("Payment update success:", response);
        
        // Refresh all relevant data
        Promise.all([
          fetchAllPayments(),
          fetchGymCashFlow(),
          fetchAllInvoices(),
          fetchUnpaidInvoices()
        ])
        .then(() => {
          // Show success message after data is refreshed
          setSnackbar({
            open: true,
            message: "Payment updated successfully!",
            severity: "success",
          });
          setLoading(false);
        })
        .catch(error => {
          console.error("Error refreshing data:", error);
          // Still show success since payment was updated
          setSnackbar({
            open: true,
            message: "Payment updated successfully, but data refresh failed. Please refresh the page.",
            severity: "warning",
          });
          setLoading(false);
        });
      })
      .catch(error => {
        console.error("Error updating payment:", error);
        // Reopen dialog if there was an error
        setEditPaymentOpen(true);
        setSnackbar({
          open: true,
          message: "Error updating payment: " + (error.response?.data?.message || error.message || "Unknown error"),
          severity: "error",
        });
        setLoading(false);
      });
  };

  const handleViewPaymentOpen = (row) => {
    setViewPayment(row);
    setViewPaymentOpen(true);
  };

  // ==================== Invoice: Add, Edit, View ====================
  const handleAddInvoiceChange = (e) => {
    const { name, value } = e.target;
    setNewInvoice((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddInvoiceSubmit = () => {
    const payload = {
      MemberID: newInvoice.memberId,
      InvoiceDate: newInvoice.invoiceDate,
      DueDate: newInvoice.dueDate,
      InvoiceTotal: newInvoice.invoiceTotal,
    };

    axios
      .post("/invoices", payload)
      .then(() => fetchAllInvoices())
      .then(() => {
        setAddInvoiceOpen(false);
        setNewInvoice({
          memberId: "",
          invoiceDate: "",
          dueDate: "",
          invoiceTotal: 0,
          status: "",
        });
      })
      .catch((err) => console.error(err));
  };

  const handleEditInvoiceOpen = (row) => {
    setEditInvoice(row);
    setEditInvoiceOpen(true);
  };

  const handleEditInvoiceChange = (e) => {
    const { name, value } = e.target;
    setEditInvoice((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInvoiceSubmit = () => {
    const payload = {
      MemberID: editInvoice.memberId,
      InvoiceDate: editInvoice.invoiceDate,
      DueDate: editInvoice.dueDate,
      InvoiceTotal: editInvoice.invoiceTotal,
    };

    axios
      .put(`/invoices/${editInvoice.invoiceId}`, payload)
      .then(() => fetchAllInvoices())
      .then(() => {
        setEditInvoiceOpen(false);
      })
      .catch((err) => console.error(err));
  };

  const handleViewInvoiceOpen = (row) => {
    axios
      .get(`/invoices/${row.invoiceId}`)
      .then((res) => {
        const fetched = {
          invoiceId: res.data.InvoiceID,
          memberName: res.data.member ? res.data.member.FullName : "N/A",
          invoiceDate: res.data.InvoiceDate,
          dueDate: res.data.DueDate,
          invoiceTotal: res.data.InvoiceTotal,
          lineItems: res.data.line_items || [],
        };
        setViewInvoice(fetched);
        setViewInvoiceOpen(true);
      })
      .catch((err) => console.error(err));
  };

  // ==================== Export Menu ====================
  const handleExportMenuOpen = (event) => {
    setExportAnchorEl(event.currentTarget);
  };
  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };

  const csvHeadersPayments = [
    { label: "Payment ID", key: "paymentId" },
    { label: "Payer Name", key: "payerName" },
    { label: "Payment Date", key: "paymentDate" },
    { label: "Amount Paid", key: "amountPaid" },
    { label: "Method", key: "method" },
    { label: "Status", key: "status" },
  ];

  const csvHeadersInvoices = [
    { label: "Invoice ID", key: "invoiceId" },
    { label: "Member Name", key: "memberName" },
    { label: "Invoice Date", key: "invoiceDate" },
    { label: "Due Date", key: "dueDate" },
    { label: "Total Amount", key: "invoiceTotal" },
  ];

  const handleExportCSV = () => {
    handleExportMenuClose();
    // CSV is handled by <CSVLink>
  };
  const handleExportPDF = () => {
    handleExportMenuClose();
    const itemsToExport = activeTab === 0 ? filteredPayments : filteredInvoices;
    if (itemsToExport.length === 0) {
      alert("No data available to export.");
      return;
    }
  
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });
  
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
  
    // Background images for cover and (optionally) subsequent pages
    const coverPage = "/imgs/coverpage2.png";
    // const addPage = "/imgs/addpage2.png"; // Not used now
  
    let tableHeaders = [];
    let tableBody = [];
    let title = "";
  
    if (activeTab === 0) {
      title = "Payments Report";
      tableHeaders = ["ID", "Payer", "Date", "Amount", "Method", "Status"];
      tableBody = itemsToExport.map((p) => [
        p.paymentId || "N/A",
        p.payerName || "N/A",
        formatDate(p.paymentDate),
        parseFloat(p.amountPaid || 0).toFixed(2),
        p.method || "N/A",
        p.status || "N/A",
      ]);
    } else {
      title = "Invoices Report";
      tableHeaders = ["ID", "Member", "Invoice Date", "Due Date", "Amount"];
      tableBody = itemsToExport.map((i) => [
        i.invoiceId || "N/A",
        i.memberName || "N/A",
        formatDate(i.invoiceDate),
        formatDate(i.dueDate),
        parseFloat(i.invoiceTotal || 0).toFixed(2),
      ]);
    }
  
    if (tableBody.length === 0) {
      alert("No records to export.");
      return;
    }
  
    // Draw the cover background and header text on the first page
    doc.addImage(coverPage, "PNG", 0, 0, pageWidth, pageHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor("#ffffff");
    doc.text(title, pageWidth / 2, 100, { align: "center" });
    doc.setFontSize(14);
    doc.text("Generated on: " + new Date().toLocaleDateString(), pageWidth / 2, 130, {
      align: "center",
    });
  
    // Define a starting Y position that leaves room for header content
    const startY = 100;
  
    const getStatusColor = (status) => {
      if (status?.toLowerCase() === "completed" || status?.toLowerCase() === "paid") {
        return "#4CAF50";
      }
      return "#333333";
    };
  
    // Generate the table. AutoTable will handle page breaks automatically.
    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: startY,
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
      margin: { top: 50, left: 20, right: 20, bottom: 20 },
      didParseCell: (data) => {
        if (activeTab === 0 && data.column.index === 5) {
          const statusText = data.cell.raw;
          data.cell.styles.textColor = getStatusColor(statusText);
        }
      },
      // Removed didDrawPage callback to prevent re‑adding backgrounds on subsequent pages.
    });
  
    const pdfFilename = activeTab === 0 ? "PaymentsReport.pdf" : "InvoicesReport.pdf";
    doc.save(pdfFilename);
  };


    // ==================== Loading Front-end ====================
    if (loading) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh"
          }}
        >
          <CircularProgress />
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 3 }}>
        {/* ---------- FILTERS SECTION ---------- */}
        <Paper sx={{ p: 3, mb: 3, boxShadow: 3, borderRadius: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            Sales Report Filters
          </Typography>
          <Grid container spacing={2}>
            {/* From Date */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="From Date"
                type="date"
                fullWidth
                size="small"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            {/* To Date */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="To Date"
                type="date"
                fullWidth
                size="small"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            {/* Branch */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Branch</InputLabel>
                <Select
                  label="Branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  {branchOptions.map((b) => (
                    <MenuItem key={b.value} value={b.value}>
                      {b.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
    
        {/* ---------- SALES REPORT HEADER ---------- */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Sales Reports
          </Typography>
          {/* You could add a button or secondary action here if needed */}
        </Box>
        
        {/* ---------- MAIN DATA DISPLAY ---------- */}
        <Paper
          variant="outlined"
          elevation={0}
          sx={{ p: 2, height: "100%", borderRadius: 3, position: "relative" }}
        >
          {/* Floating Action Button for adding payment */}
          <Zoom in={true}>
            <Tooltip title="Create New Payment" placement="left">
              <Fab 
                color="primary" 
                aria-label="add payment"
                sx={{ 
                  position: 'fixed',
                  bottom: 30,
                  right: 30,
                  zIndex: 1000
                }}
                onClick={(event) => setPaymentMenuAnchorEl(event.currentTarget)}
              >
                <AddIcon />
              </Fab>
            </Tooltip>
          </Zoom>
          
          {/* Payment type selection menu */}
          <Menu
            anchorEl={paymentMenuAnchorEl}
            open={Boolean(paymentMenuAnchorEl)}
            onClose={() => setPaymentMenuAnchorEl(null)}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => {
              handleAddPaymentOpen("booking");
              setPaymentMenuAnchorEl(null);
            }}>
              <CalendarTodayIcon sx={{ mr: 1 }} /> Facility Booking Payment
            </MenuItem>
            <MenuItem onClick={() => {
              handleAddPaymentOpen("session");
              setPaymentMenuAnchorEl(null);
            }}>
              <EventIcon sx={{ mr: 1 }} /> Coach Session Payment
            </MenuItem>
          </Menu>
          
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "60vh",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
          {activeTab === 2 && (
            <>
              {/* PIVOT TABLE / DATA GRID */}
              <Box sx={{ mt: 2 }}>
                <div style={{ height: 420, width: "100%" }}>
                  <DataGrid
                    rows={filteredGymSales}
                    columns={[
                      {
                        field: "date",
                        headerName: "Date",
                        width: 250,
                        renderCell: (params) =>
                          params.value ? formatDate(params.value) : "—",
                      },
                      {
                        field: "rawCash",
                        headerName: "Cash",
                        width: 120,
                        renderCell: (params) =>
                          params.value
                            ? `₱${Number(params.value).toLocaleString()}`
                            : "—",
                      },
                      {
                        field: "pettyCash",
                        headerName: "PC (Today)",
                        width: 130,
                        renderCell: ({ value }) =>
                          value ? `₱${Number(value).toLocaleString()}` : "—",
                      },
                      {
                        field: "cashPlusPetty",
                        headerName: "Cash+PC Today",
                        width: 150,
                        renderCell: ({ value }) =>
                          value ? `₱${Number(value).toLocaleString()}` : "—",
                      },
                      {
                        field: "pettyTomorrow",
                        headerName: "PC (Tomorrow)",
                        width: 140,
                        renderCell: ({ value }) =>
                          value ? `₱${Number(value).toLocaleString()}` : "—",
                      },
                      {
                        field: "cashPlusPettyMinusTomorrow",
                        headerName: "Cash+PC - PC Tomorrow",
                        width: 180,
                        renderCell: ({ value }) =>
                          value ? `₱${Number(value).toLocaleString()}` : "—",
                      },
                      {
                        field: "rawGCash",
                        headerName: "GCash",
                        width: 130,
                        renderCell: (params) =>
                          params.value
                            ? `₱${Number(params.value).toLocaleString()}`
                            : "—",
                      },
                      {
                        field: "rawBPI",
                        headerName: "BPI",
                        width: 130,
                        renderCell: (params) =>
                          params.value
                            ? `₱${Number(params.value).toLocaleString()}`
                            : "—",
                      },
                      {
                        field: "rawBDO",
                        headerName: "BDO",
                        width: 130,
                        renderCell: (params) =>
                          params.value
                            ? `₱${Number(params.value).toLocaleString()}`
                            : "—",
                      },
                      {
                        field: "totalSales",
                        headerName: "Total Sales",
                        width: 130,
                        renderCell: (params) =>
                          params.value
                            ? `₱${Number(params.value).toLocaleString()}`
                            : "—",
                      },
                      {
                        field: "takeHome",
                        headerName: "Take-Home",
                        width: 130,
                        renderCell: (params) =>
                          params.value
                            ? `₱${Number(params.value).toLocaleString()}`
                            : "—",
                      },
                      {
                        field: "actions",
                        headerName: "Actions",
                        width: 120,
                        sortable: false,
                        renderCell: (params) => (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => openPettyDialog(params.row)}
                          >
                            Add Petty
                          </Button>
                        ),
                      },
                    ]}
                    getRowId={(row) => row.date}
                    pageSize={5}
                    rowsPerPageOptions={[5, 10]}
                  />
                </div>
              </Box>
    
            {/* DETAILED BREAKDOWN */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Detailed Breakdown
              </Typography>
              <TextField
                type="date"
                value={selectedDetailDate}
                onChange={(e) => setSelectedDetailDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: "bold",
                  color: "primary.main",
                  fontSize: "1.2rem",
                }}
              >
                Detailed records for: {formatDate(selectedDetailDate)}
              </Typography>

              {/* Map through PaymentFor categories */}
              {Object.entries(
                groupPaymentsByPaymentFor(
                  allPayments.filter((p) => {
                    // Match selected date
                    if (p.paymentDate.split(" ")[0] !== selectedDetailDate) return false;
                    // Match selected branch
                    if (branch !== "all" && p.branchId !== branch) return false;
                    return true;
                  })
                )
              ).map(([categoryName, paymentRows]) => {
                // Compute sums for columns in this category
                let sumCash = 0,
                  sumGCash = 0,
                  sumBPI = 0,
                  sumBDO = 0,
                  grandTotal = 0;

                paymentRows.forEach((r) => {
                  sumCash += r.cash;
                  sumGCash += r.gcash;
                  sumBPI += r.bpi;
                  sumBDO += r.bdo;
                  grandTotal += r.total;
                });

                return (
                  <Paper
                    key={categoryName}
                    sx={{
                      mt: 2,
                      p: 2,
                      border: 1,
                      borderColor: theme.palette.divider,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {categoryName}
                    </Typography>

                    <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow
                          sx={{
                            backgroundColor:
                              theme.palette.mode === "light" ? "#f7f7f7" : theme.palette.grey[800],
                          }}
                        >
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Cash</TableCell>
                          <TableCell align="right">GCash</TableCell>
                          <TableCell align="right">BPI</TableCell>
                          <TableCell align="right">BDO</TableCell>
                          <TableCell align="right">Row Total</TableCell>
                          <TableCell align="right">Note</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentRows.map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{r.payerName}</TableCell>
                            <TableCell align="right">{r.cash > 0 ? r.cash.toLocaleString() : ""}</TableCell>
                            <TableCell align="right">{r.gcash > 0 ? r.gcash.toLocaleString() : ""}</TableCell>
                            <TableCell align="right">{r.bpi > 0 ? r.bpi.toLocaleString() : ""}</TableCell>
                            <TableCell align="right">{r.bdo > 0 ? r.bdo.toLocaleString() : ""}</TableCell>
                            <TableCell align="right">{r.total > 0 ? r.total.toLocaleString() : ""}</TableCell>
                            <TableCell align="right">{r.note || 'No Note'}</TableCell>
                            <TableCell align="right">
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => openEditNoteDialog(r.paymentId, r.note)}
                              >
                                {r.note ? 'Edit Note' : 'Add Note'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow sx={{ fontWeight: "bold" }}>
                          <TableCell>Totals</TableCell>
                          <TableCell align="right">{sumCash.toLocaleString()}</TableCell>
                          <TableCell align="right">{sumGCash.toLocaleString()}</TableCell>
                          <TableCell align="right">{sumBPI.toLocaleString()}</TableCell>
                          <TableCell align="right">{sumBDO.toLocaleString()}</TableCell>
                          <TableCell align="right">{grandTotal.toLocaleString()}</TableCell>
                          <TableCell colSpan={2} /> {/* Empty cells for 'Note' and 'Actions' in totals row */}
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </TableContainer>
                  </Paper>
                );
              })}
            </Box>

                </>
              )}
            </>
          )}
        </Paper>
    
        {/* ---------- ALL DIALOGS BELOW (kept at bottom for clarity) ---------- */}
        {/* ADD Payment Dialog */}
        <Dialog open={isAddPaymentOpen} onClose={closePaymentDialog} fullWidth maxWidth="md">
          <DialogTitle>
            {paymentMode === "booking" && "Add Facility Booking Payment"}
            {paymentMode === "session" && "Add Coach Session Payment"}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Show Member selector for all payment types */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="member-select-label">Member</InputLabel>
                  <Select
                    labelId="member-select-label"
                    id="member-select"
                    name="memberId"
                    value={newPayment.memberId}
                    onChange={handleAddPaymentChange}
                    label="Member"
                  >
                    <MenuItem value="">
                      <em>Select a member</em>
                    </MenuItem>
                    {members.map((member) => (
                      <MenuItem key={member.MemberID} value={member.MemberID}>
                        {member.FullName} - {member.CardNumber}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Booking reference field */}
              {paymentMode === "booking" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="bookingRef"
                    name="bookingRef"
                    label="Booking Reference"
                    value={newPayment.bookingRef}
                    onChange={handleAddPaymentChange}
                  />
                </Grid>
              )}

              {/* Session reference field */}
              {paymentMode === "session" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="sessionRef"
                    name="sessionRef"
                    label="Session Reference"
                    value={newPayment.sessionRef}
                    onChange={handleAddPaymentChange}
                  />
                </Grid>
              )}

              {/* Common fields for all payment types */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="paymentDate"
                  name="paymentDate"
                  label="Payment Date"
                  type="date"
                  value={newPayment.paymentDate}
                  onChange={handleAddPaymentChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="amountPaid"
                  name="amountPaid"
                  label="Amount"
                  type="number"
                  value={newPayment.amountPaid}
                  onChange={handleAddPaymentChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="payment-method-label">Payment Method</InputLabel>
                  <Select
                    labelId="payment-method-label"
                    id="payment-method"
                    name="method"
                    value={newPayment.method}
                    onChange={handleAddPaymentChange}
                    label="Payment Method"
                  >
                    <MenuItem value="">
                      <em>Select payment method</em>
                    </MenuItem>
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="GCash">GCash</MenuItem>
                    <MenuItem value="BPI">BPI</MenuItem>
                    <MenuItem value="BDO">BDO</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="payment-status-label">Payment Status</InputLabel>
                  <Select
                    labelId="payment-status-label"
                    id="payment-status"
                    name="status"
                    value={newPayment.status}
                    onChange={handleAddPaymentChange}
                    label="Payment Status"
                  >
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Failed">Failed</MenuItem>
                    <MenuItem value="Refunded">Refunded</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="note"
                  name="note"
                  label="Note"
                  multiline
                  rows={3}
                  value={newPayment.note || ""}
                  onChange={handleAddPaymentChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={closePaymentDialog}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleAddPaymentSubmit}
              startIcon={<SaveIcon />}
              disabled={!newPayment.method || !newPayment.paymentDate || !newPayment.amountPaid}
            >
              Save Payment
            </Button>
          </DialogActions>
        </Dialog>
    
        {/* PARTIAL Payment Dialog */}
        <Dialog
          open={partialDialogOpen}
          onClose={closePartialDialog}
          fullWidth
          maxWidth="lg"
        >
          <DialogTitle>
            {/* ... partial payment dialog title ... */}
          </DialogTitle>
          <DialogContent dividers>
            {/* ... partial payment form ... */}
          </DialogContent>
        </Dialog>
    
        {/* EDIT Payment Dialog */}
        <Dialog
          open={isEditPaymentOpen}
          onClose={() => setEditPaymentOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {/* ... edit payment title ... */}
          </DialogTitle>
          <DialogContent dividers>
            {/* ... edit payment fields ... */}
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleEditPaymentSubmit}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
    
        {/* VIEW Payment Dialog */}
        <Dialog
          open={isViewPaymentOpen}
          onClose={() => setViewPaymentOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {/* ... view payment details ... */}
          </DialogTitle>
          <DialogContent dividers>
            {/* ... read-only fields ... */}
          </DialogContent>
        </Dialog>
    
        {/* ADD Invoice Dialog */}
        <Dialog open={isAddInvoiceOpen} onClose={() => setAddInvoiceOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>
            {/* ... Add Invoice Title ... */}
          </DialogTitle>
          <DialogContent dividers>
            {/* ... new invoice form ... */}
          </DialogContent>
        </Dialog>
    
        {/* CONFIRMATION DIALOG */}
        <Dialog
          open={openConfirmation}
          onClose={() => setOpenConfirmation(false)}
          PaperProps={{ sx: { borderRadius: 3, minWidth: 350 } }}
        >
          <DialogTitle sx={{ textAlign: "center", p: 3 }}>
            {/* ... confirmation title ... */}
          </DialogTitle>
          <DialogContent dividers sx={{ textAlign: "center", py: 2 }}>
            {/* ... confirmation message ... */}
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", gap: 2, py: 2 }}>
            {/* ... confirmation actions ... */}
          </DialogActions>
        </Dialog>
    
        {/* EDIT Invoice Dialog */}
        <Dialog
          open={isEditInvoiceOpen}
          onClose={() => setEditInvoiceOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {/* ... edit invoice title ... */}
          </DialogTitle>
          <DialogContent dividers>
            {/* ... edit invoice fields ... */}
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={handleEditInvoiceSubmit}>
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
    
        {/* VIEW Invoice Dialog */}
        <Dialog
          open={isViewInvoiceOpen}
          onClose={() => setViewInvoiceOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {/* ... view invoice title ... */}
          </DialogTitle>
          <DialogContent dividers>
            {/* ... read-only invoice fields ... */}
          </DialogContent>
        </Dialog>
    
        {/* DELETE Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DeleteForeverIcon color="error" />
            Confirm Deletion
          </DialogTitle>
          <DialogContent dividers>
            <Typography>{getDeleteMessage()}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} sx={{ color: "gray" }}>
              Cancel
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
    
        {/* Petty Cash Dialog */}
        <Dialog
          open={pettyDialogOpen}
          onClose={() => setPettyDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Set Petty Cash</DialogTitle>
          <DialogContent dividers>
            {selectedFlowRow && (
              <>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Date: <strong>{selectedFlowRow.date}</strong>
                </Typography>
    
                <TextField
                  label="Today's Petty Cash"
                  name="pettyCash"
                  type="number"
                  fullWidth
                  value={pettyForm.pettyCash}
                  onChange={(e) =>
                    setPettyForm((prev) => ({ ...prev, pettyCash: e.target.value }))
                  }
                  sx={{ mb: 2 }}
                />
    
                <TextField
                  label="Petty Cash Tomorrow"
                  name="pettyTomorrow"
                  type="number"
                  fullWidth
                  value={pettyForm.pettyTomorrow}
                  onChange={(e) =>
                    setPettyForm((prev) => ({
                      ...prev,
                      pettyTomorrow: e.target.value,
                    }))
                  }
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPettyDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmitPetty}>
              Save Petty
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
            open={noteDialogOpen}
            onClose={closeEditNoteDialog}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Edit Note</DialogTitle>
            <DialogContent dividers>
              <TextField
                label="Note"
                multiline
                minRows={3}
                fullWidth
                value={noteData.note}
                onChange={(e) =>
                  setNoteData((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={closeEditNoteDialog}>Cancel</Button>
              <Button variant="contained" onClick={handleSaveNote}>
                Save
              </Button>
            </DialogActions>
          </Dialog>

        {/* Snackbar for displaying notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
    
}
