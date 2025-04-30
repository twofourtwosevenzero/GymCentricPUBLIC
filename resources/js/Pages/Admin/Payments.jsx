import React, { useState, useEffect } from "react";
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
  IconButton,
  Divider,
  InputAdornment,
  OutlinedInput,
  useTheme,
  TableFooter,
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
import jsPDF from "jspdf";
import "jspdf-autotable";
import dayjs from "dayjs";
import { CSVLink } from "react-csv";
import { AttachMoney } from "@mui/icons-material";

export default function PaymentsAndInvoices() {
  const theme = useTheme();

  // ==================== State Hooks ====================

  // For unfiltered data from server
  const [allPayments, setAllPayments] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);

  // For filtered data displayed in the table
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);

  // For detailed breakdown
  const [selectedDetailDate, setSelectedDetailDate] = useState(() => {
    // Get current date in Manila time (UTC+8)
    const manilaDate = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
    return manilaDate.toISOString().split('T')[0];
  });

  // Active tab, search, and branch
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  // Updated default: no extra "all" option, only the admin's branches will be shown
  const [branch, setBranch] = useState("");
  const [branchOptions, setBranchOptions] = useState([]);
  const [adminInfo, setAdminInfo] = useState(null);

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
    status: "",
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

  // Confirmation dialog
  const [openConfirmation, setOpenConfirmation] = useState(false);

  // Export menu
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  // Note dialog state
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteData, setNoteData] = useState({
    paymentId: null,
    note: '',
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

  // Payment-date filter for payments
  function filterPaymentsByDate(payments, start, end) {
    if (!start && !end) return payments;
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return payments.filter((p) => {
      const d = new Date(p.paymentDate);
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
      const d = new Date(inv.invoiceDate);
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  }

  // The main "handleFilterData" function
  const handleFilterData = () => {
    // 1) Filter payments by PaymentDate
    const dateFilteredPayments = filterPaymentsByDate(allPayments, dateFrom, dateTo);

    // 2) Filter invoices by InvoiceDate
    const dateFilteredInvoices = filterInvoicesByDate(allInvoices, dateFrom, dateTo);

    // 3) Then filter by branch.
    // Here, if no branch is selected (empty string), do not filter by branch.
    const branchFilteredPayments =
      branch === "" ? dateFilteredPayments : dateFilteredPayments.filter((p) => p.branchId === branch);

    const branchFilteredInvoices =
      branch === "" ? dateFilteredInvoices : dateFilteredInvoices.filter((inv) => inv.branchId === branch);

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

  // ==================== useEffect Fetch Calls ====================
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await axios.get('/admin/info');
        setAdminInfo(response.data.admin);
        
        // If admin has a default branch, set it as the filter
        if (response.data.admin && response.data.admin.defaultBranchId) {
          setBranch(String(response.data.admin.defaultBranchId));
        }
      } catch (error) {
        console.error('Failed to fetch admin info:', error);
      }
    };
    
    // First fetch admin info and branches
    const init = async () => {
      await fetchAdminInfo();
      await fetchBranches();
      await fetchMembers();
      // Now fetch payments and invoices after we know the branch
      fetchAllPayments();
      fetchAllInvoices();
      fetchUnpaidInvoices();
    };
    
    init();
  }, []);

  // Reload data whenever branch changes
  useEffect(() => {
    if (branch) {
      fetchAllPayments();
      fetchAllInvoices();
      fetchUnpaidInvoices();
    }
  }, [branch]);

  useEffect(() => {
    handleFilterData();
  }, [searchTerm, dateFrom, dateTo, branch, allPayments, allInvoices]);

  // ==================== Fetch Functions ====================

  // 1) MEMBERS
  const fetchMembers = async () => {
    try {
      const res = await axios.get("/membership/members");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.members || [];
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2) BRANCHES – Updated to use the admin's assigned branches endpoint and remove the "All Branches" option
  const fetchBranches = async () => {
    try {
      const branchRes = await axios.get("/admin/branches");
      console.log("Branches response:", branchRes.data);
      
      // Create branch options from API response
      const branchOptions = [];
      
      // Add branches from the API response
      if (branchRes.data.branches && branchRes.data.branches.length > 0) {
        branchRes.data.branches.forEach((b) => {
          branchOptions.push({
            value: b.BranchID.toString(),
            label: b.BranchName,
          });
        });
      }
      
      setBranchOptions(branchOptions);
      
      // Optionally set default branch if only one branch is returned
      if (branchOptions.length === 1) {
        setBranch(branchOptions[0].value);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
      setBranchOptions([]);
    }
  };

  const fetchAllPayments = async () => {
    try {
      // Add branch filter to the URL if a branch is selected
      const url = branch ? `/payments?branch=${branch}` : "/payments";
      const res = await axios.get(url);
      
      // Debug: print just the count of payments
      console.log(`Fetched ${res.data.length} raw payments from API`);
      
      const mapped = res.data.map((p) => {
        let paymentForArray = [];
        
        // Handle PaymentFor safely - preserve original format when possible
        try {
          if (p.PaymentFor === null) {
            paymentForArray = ["Membership Payment"];
          } else if (typeof p.PaymentFor === 'string') {
            // Special handling for PT Session values
            if (p.PaymentFor.includes('PT Session') || p.PaymentFor.includes('Session')) {
              try {
                // Try parsing as JSON
                const parsed = JSON.parse(p.PaymentFor);
                paymentForArray = Array.isArray(parsed) ? parsed : [p.PaymentFor];
                
                // Only log PT Session payments for debugging
                if (p.PaymentFor.includes('PT Session') || p.PaymentFor.includes('Session')) {
                  console.log(`PT Session payment detected (ID: ${p.PaymentID}):`, p.PaymentFor, "→", paymentForArray);
                }
              } catch (error) {
                // If parsing fails, check if it contains the keywords
                if (p.PaymentFor.includes('PT Session')) {
                  paymentForArray = ["PT Session"];
                } else if (p.PaymentFor.includes('Session')) {
                  paymentForArray = ["Session"];
                } else {
                  paymentForArray = [p.PaymentFor];
                }
                
                // Log parsing failures for PT Session payments
                if (p.PaymentFor.includes('PT Session') || p.PaymentFor.includes('Session')) {
                  console.log(`PT Session payment parsing failed (ID: ${p.PaymentID}):`, p.PaymentFor, "→", paymentForArray);
                }
              }
            } else {
              // For other string values, try parsing as JSON first
              try {
                const parsed = JSON.parse(p.PaymentFor);
                paymentForArray = Array.isArray(parsed) ? parsed : [p.PaymentFor];
              } catch (error) {
                // If not valid JSON, use as a simple string
                paymentForArray = [p.PaymentFor];
              }
            }
          } else if (Array.isArray(p.PaymentFor)) {
            paymentForArray = p.PaymentFor;
          }
        } catch (error) {
          console.error("Error processing PaymentFor:", error, p.PaymentFor);
          paymentForArray = p.PaymentFor ? [String(p.PaymentFor)] : ["Membership Payment"];
        }
        
        // Preserve the original payment date string (e.g. "2025-03-26 00:00:00")
        const paymentDate = p.PaymentDate;
        
        return {
          paymentId: p.PaymentID,
          memberId: p.MemberID ? p.MemberID.toString() : "",
          monthlyClientId: p.MonthlyClientID ? p.MonthlyClientID.toString() : "",
          payerName:
            p.PayerName ??
            p.member?.FullName ??
            p.monthly_client?.FullName ??
            p.WalkInName ??
            "N/A",
          paymentDate: paymentDate, // Keep the original format
          amountPaid: Number(p.Amount),
          method: p.PaymentMethod,
          status: p.Status,
          branchId: p.BranchID ? p.BranchID.toString() : "",
          paymentFor: paymentForArray,
          note: p.Note || "",
          // Store the original value for debugging
          originalPaymentFor: p.PaymentFor
        };
      });
      
      setAllPayments(mapped);
      setFilteredPayments(mapped);
      console.log(`Loaded ${mapped.length} payments for branch: ${branch || 'All'}`);
      
      // Count PT Session payments
      const ptSessionCount = mapped.filter(p => 
        Array.isArray(p.paymentFor) && 
        p.paymentFor.some(cat => cat.includes('PT Session') || cat.includes('Session'))
      ).length;
      console.log(`Found ${ptSessionCount} PT Session payments after processing`);
    } catch (err) {
      console.error("Error fetching payments:", err);
    }
  };

  const fetchAllInvoices = async () => {
    try {
      // Add branch filter to the URL if a branch is selected
      const url = branch ? `/invoices?branch=${branch}` : "/invoices";
      const res = await axios.get(url);
      const mapped = res.data.map((inv) => ({
        invoiceId: inv.InvoiceID,
        memberId: inv.MemberID ? inv.MemberID.toString() : "",
        memberName: inv.member?.FullName ?? inv.monthly_client?.FullName ?? "N/A",
        invoiceDate: inv.InvoiceDate,
        dueDate: inv.DueDate,
        invoiceTotal: inv.InvoiceTotal,
        status: inv.PaymentStatus,
        branchId: inv.BranchID ? inv.BranchID.toString() : "",
      }));
      setAllInvoices(mapped);
      setFilteredInvoices(mapped);
      console.log(`Loaded ${mapped.length} invoices for branch: ${branch || 'All'}`);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      // Add branch filter to the URL if a branch is selected
      const url = branch ? `/invoices?status=unpaid_or_partial&branch=${branch}` : "/invoices?status=unpaid_or_partial";
      const res = await axios.get(url);
      const mapped = (res.data || []).map((inv) => ({
        invoiceId: inv.InvoiceID,
        invoiceTotal: inv.InvoiceTotal,
        paymentStatus: inv.PaymentStatus,
        memberName: inv.member ? inv.member.FullName : "N/A",
      }));
      setUnpaidInvoices(mapped);
      console.log(`Loaded ${mapped.length} unpaid invoices for branch: ${branch || 'All'}`);
    } catch (err) {
      console.error("Error fetching unpaid invoices:", err);
    }
  };

  // ==================== Delete Logic ====================
  function handleOpenDeleteDialog(type, id) {
    setDeleteType(type);
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    try {
      if (deleteType === "payment") {
        await axios.delete(`/payments/${deleteItemId}`);
        setAllPayments((prev) => prev.filter((p) => p.paymentId !== deleteItemId));
        setFilteredPayments((prev) => prev.filter((p) => p.paymentId !== deleteItemId));
      } else if (deleteType === "invoice") {
        await axios.delete(`/invoices/${deleteItemId}/delete`);
        setAllInvoices((prev) => prev.filter((i) => i.invoiceId !== deleteItemId));
        setFilteredInvoices((prev) => prev.filter((i) => i.invoiceId !== deleteItemId));
      }
      alert(`${deleteType} #${deleteItemId} deleted successfully!`);
    } catch (error) {
      console.error(`Failed to delete ${deleteType}:`, error);
      alert("Error deleting record. Check console.");
    } finally {
      handleCloseDeleteDialog();
    }
  }

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

  // ==================== Tab Logic ====================
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchTerm("");
  };

  // ==================== Table Columns ====================
  // Payment columns
  const paymentColumns = [
    {
      field: "paymentDate",
      headerName: "Payment Date",
      width: 250,
      renderCell: (params) =>
        params.value ? formatDate(params.value) : "—",
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
              onClick={() => {
                setViewPayment(params.row);
                setViewPaymentOpen(true);
              }}              
            >
              <VisibilityIcon fontSize="small" />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#2196f3", color: "#fff", minWidth: 40 }}
              onClick={() => setEditPaymentOpen(params.row)}
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
        params.value ? formatDateTime(params.value) : "—",
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

  // Determine displayed rows/columns based on active tab
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
    });
    setAddPaymentOpen(true);
  };

  const closePaymentDialog = () => {
    setAddPaymentOpen(false);
  };

  const handleAddPaymentOpen = (mode) => {
    if (mode === "partial") {
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

    axios
      .post("/payments/partial", payload)
      .then(() => {
        alert("Partial payment created successfully!");
        fetchAllPayments();
        setPartialDialogOpen(false);
      })
      .catch((err) => console.error(err));
  };

  const handleAddInvoiceAlloc = (inv) => {
    const existing = partialPayment.allocatedInvoices.find((x) => x.invoiceId === inv.invoiceId);
    if (!existing) {
      setPartialPayment((prev) => ({
        ...prev,
        allocatedInvoices: [
          ...prev.allocatedInvoices,
          { invoiceId: inv.invoiceId, amountAllocated: inv.invoiceTotal },
        ],
      }));
    }
  };

  // Payment creation
  const handleAddPaymentChange = (e) => {
    const { name, value } = e.target;
    setNewPayment((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPaymentSubmit = () => {
    let paymentForArr = [];
    switch (paymentMode) {
      case "member":
        paymentForArr = ["Membership"];
        break;
      case "walkIn":
        paymentForArr = ["Walk-In"];
        break;
      case "booking":
        paymentForArr = ["Booking"];
        break;
      case "session":
        paymentForArr = ["Session"];
        break;
      default:
        paymentForArr = ["Others"];
    }

    const payload = {
      MemberID: paymentMode === "walkIn" ? null : newPayment.memberId,
      PaymentFor: paymentForArr,
      PaymentMethod: newPayment.method,
      Amount: Number(newPayment.amountPaid),
      PaymentDate: newPayment.paymentDate,
      Status: newPayment.status || "Pending",
      WalkInName: paymentMode === "walkIn" ? newPayment.walkInName : null,
      BookingRef: paymentMode === "booking" ? newPayment.bookingRef : null,
      SessionRef: paymentMode === "session" ? newPayment.sessionRef : null,
    };

    axios
      .post("/payments", payload)
      .then(() => {
        fetchAllPayments();
        setAddPaymentOpen(false);
      })
      .catch((err) => console.error(err));
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
    const existingFor =
      Array.isArray(editPayment.paymentFor) && editPayment.paymentFor.length > 0
        ? editPayment.paymentFor
        : ["Membership"];

    const payload = {
      MemberID: editPayment.memberId || null,
      PaymentFor: existingFor,
      PaymentMethod: editPayment.method,
      Amount: Number(editPayment.amountPaid),
      PaymentDate: editPayment.paymentDate,
      Status: editPayment.status,
    };

    axios
      .put(`/payments/${editPayment.paymentId}`, payload)
      .then(() => {
        fetchAllPayments();
        setEditPaymentOpen(false);
      })
      .catch((err) => console.error(err));
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

    // Background images for cover
    const coverPage = "/imgs/coverpage2.png";

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

    const startY = 100;

    const getStatusColor = (status) => {
      if (status?.toLowerCase() === "completed" || status?.toLowerCase() === "paid") {
        return "#4CAF50";
      }
      return "#333333";
    };

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
    });

    const pdfFilename = activeTab === 0 ? "PaymentsReport.pdf" : "InvoicesReport.pdf";
    doc.save(pdfFilename);
  };

  function normalizePaymentMethod(method) {
    if (!method) return "";
    const lower = method.toLowerCase();
  
    // Check "gcash" first; it contains "cash" at the end, so we handle it first
    if (lower.includes("gcash")) return "GCash";
    if (lower.includes("bpi")) return "BPI";
    if (lower.includes("bdo")) return "BDO";
  
    // Lastly, if it has "cash" (including "W-In Cash"), treat as Cash
    if (lower.includes("cash")) return "Cash";
  
    return method;
  }
  
  function groupPaymentsByPaymentFor(payments) {
    const result = {};

    payments.forEach((pay) => {
      // Check if any of our values contain PT Session - this is the key part
      const hasPTSession = 
        (Array.isArray(pay.paymentFor) && pay.paymentFor.some(p => 
          typeof p === 'string' && (p.includes('PT Session') || p.includes('Session')))) ||
        (typeof pay.originalPaymentFor === 'string' && 
          (pay.originalPaymentFor.includes('PT Session') || pay.originalPaymentFor.includes('Session')));
      
      // Get paymentFor as an array, ensuring we handle both string JSON and array formats
      let paymentForArray = [];
      
      if (hasPTSession) {
        // If it's a PT Session, standardize to this format
        paymentForArray = ["PT Session"]; 
      } 
      // If not a PT Session, use normal logic
      else {
        // Use the processed paymentFor if available
        if (Array.isArray(pay.paymentFor) && pay.paymentFor.length > 0) {
          paymentForArray = pay.paymentFor;
        }
        // Try to parse originalPaymentFor if we couldn't process it earlier
        else if (typeof pay.originalPaymentFor === 'string' && pay.originalPaymentFor.trim() !== '') {
          try {
            const parsed = JSON.parse(pay.originalPaymentFor);
            paymentForArray = Array.isArray(parsed) ? parsed : [pay.originalPaymentFor];
          } catch (e) {
            paymentForArray = [pay.originalPaymentFor];
          }
        }
        // Default fallback
        else {
          paymentForArray = ["Membership Payment"];
        }
      }
      
      // Iterate over each category in the paymentFor array
      paymentForArray.forEach((category) => {
        if (!category) {
          category = "Membership Payment";
        }
        
        const normalizedCategory = String(category).trim();

        // If category doesn't exist in results, create it
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
  
      // Update local data so we don't have to re-fetch everything
      setAllPayments((prev) =>
        prev.map((p) =>
          p.paymentId === noteData.paymentId
            ? { ...p, note: noteData.note }
            : p
        )
      );
  
      closeEditNoteDialog();
    } catch (err) {
      console.error(err);
      alert('Failed to save note');
    }
  }

  // ==================== JSX Return ====================
  return (
    <Box sx={{ p: 3 }}>
      {/* Date and Branch Filter Section */}
      <Paper sx={{ p: 3, mb: 2, boxShadow: 3, borderRadius: 2 }}>
        <Grid container spacing={2}>
          {/* FROM DATE */}
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
          {/* TO DATE */}
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
          {/* BRANCH */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Branch</InputLabel>
              <Select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                label="Branch"
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

      {/* Tabs */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" gutterBottom>
          Payments & Invoices
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<ReceiptIcon />} label="Payments" />
          <Tab icon={<DescriptionIcon />} label="Invoices" />
        </Tabs>
      </Box>

      {/* Search + Export + Add Buttons */}
      <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          {/* Search Field */}
          <Grid item xs sx={{ mr: 2 }}>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              sx={{ maxWidth: 350 }}
            />
          </Grid>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExportMenuOpen}>
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
                  data={activeTab === 0 ? filteredPayments : filteredInvoices}
                  headers={activeTab === 0 ? csvHeadersPayments : csvHeadersInvoices}
                  filename={activeTab === 0 ? "Payments.csv" : "Invoices.csv"}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Export CSV
                </CSVLink>
              </MenuItem>
              <MenuItem onClick={handleExportPDF}>Export PDF</MenuItem>
            </Menu>

            {activeTab === 0 && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleAddPaymentOpen("partial")}
              >
                Make Partial Payment
              </Button>
            )}
            {activeTab === 1 && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setAddInvoiceOpen(true)}
              >
                Add Invoice
              </Button>
            )}
          </Box>
        </Box>

        {/* DataGrid */}
        <div style={{ height: 455, width: "100%" }}>
          <DataGrid
            rows={displayedRows}
            columns={displayedColumns}
            getRowId={rowIdGetter}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
          />
        </div>

        {/* DETAILED BREAKDOWN */}
        {activeTab === 0 && (
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
                  // Only log PT Session payments for debugging
                  const isPTSession = Array.isArray(p.paymentFor) && 
                    p.paymentFor.some(cat => cat && typeof cat === 'string' && 
                      (cat.includes('PT Session') || cat.includes('Session')));
                  
                  if (isPTSession) {
                    console.log(`Filtering PT Session payment #${p.paymentId}:`, p.paymentFor, p.paymentDate);
                  }
                  
                  // Match the Staff implementation exactly - split date string at space
                  try {
                    const paymentDateStr = String(p.paymentDate || '');
                    const dateOnly = paymentDateStr.split(' ')[0];
                    
                    // Only log date comparisons for PT Session payments or if there's an issue
                    if (isPTSession) {
                      console.log(`PT Session payment #${p.paymentId} date: "${dateOnly}" vs selected: "${selectedDetailDate}" - Match: ${dateOnly === selectedDetailDate}`);
                    }
                    
                    // If dates don't match, filter out
                    if (dateOnly !== selectedDetailDate) {
                      return false;
                    }
                    
                    // Match selected branch if a branch is selected
                    const branchMatch = branch === "" || p.branchId === branch;
                    if (!branchMatch) {
                      return false;
                    }
                    
                    // This payment should be shown in the detailed breakdown
                    if (isPTSession) {
                      console.log(`PT Session payment #${p.paymentId} INCLUDED in detailed breakdown`);
                    }
                    return true;
                  } catch (error) {
                    console.error('Error comparing dates:', error, p.paymentDate);
                    return false;
                  }
                })
              )
            ).map(([categoryName, paymentRows]) => {
              // Log each category and the number of rows
              console.log(`Category: ${categoryName}, Payments: ${paymentRows.length}`);

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
                          <TableCell colSpan={2} />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </TableContainer>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Payment / Invoice Dialogs */}

      {/* ADD Payment Dialog (non-partial) */}
      <Dialog open={isAddPaymentOpen} onClose={closePaymentDialog}>
        <DialogTitle>
          {paymentMode === "member" && "Add Member Payment"}
          {paymentMode === "walkIn" && "Add Walk-In Payment"}
          {paymentMode === "booking" && "Add Booking Payment"}
          {paymentMode === "session" && "Add Session Payment"}
        </DialogTitle>
        <DialogContent dividers>
          {paymentMode !== "walkIn" && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Member Name</InputLabel>
              <Select
                label="Member Name"
                name="memberId"
                value={newPayment.memberId}
                onChange={handleAddPaymentChange}
              >
                <MenuItem value="">
                  <em>-- Select Member --</em>
                </MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.MemberID} value={m.MemberID}>
                    {m.FullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {paymentMode === "walkIn" && (
            <TextField
              fullWidth
              margin="normal"
              label="Walk-In Name"
              name="walkInName"
              value={newPayment.walkInName}
              onChange={handleAddPaymentChange}
            />
          )}
          {paymentMode === "booking" && (
            <TextField
              fullWidth
              margin="normal"
              label="Booking Reference"
              name="bookingRef"
              value={newPayment.bookingRef}
              onChange={handleAddPaymentChange}
            />
          )}
          {paymentMode === "session" && (
            <TextField
              fullWidth
              margin="normal"
              label="Session Reference"
              name="sessionRef"
              value={newPayment.sessionRef}
              onChange={handleAddPaymentChange}
            />
          )}

          <TextField
            fullWidth
            margin="normal"
            type="date"
            label="Payment Date"
            name="paymentDate"
            InputLabelProps={{ shrink: true }}
            value={newPayment.paymentDate}
            onChange={handleAddPaymentChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Amount Paid"
            name="amountPaid"
            type="number"
            value={newPayment.amountPaid}
            onChange={handleAddPaymentChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Method"
            name="method"
            value={newPayment.method}
            onChange={handleAddPaymentChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Status"
            name="status"
            value={newPayment.status}
            onChange={handleAddPaymentChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closePaymentDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleAddPaymentSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* PARTIAL Payment Dialog */}
      <Dialog open={partialDialogOpen} onClose={closePartialDialog} fullWidth maxWidth="lg">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              <AttachMoney sx={{ verticalAlign: "middle", mr: 1 }} />
              Create Partial Payment
            </Typography>
            <IconButton
              onClick={closePartialDialog}
              sx={{
                color: "inherit",
                "&:hover": { color: "red" },
              }}
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
                <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                <InputLabel>Member Name</InputLabel>
                <Select
                  name="memberId"
                  value={newInvoice.memberId || ""}
                  onChange={handleAddInvoiceChange}
                  input={
                    <OutlinedInput
                      label="Member Name"
                      startAdornment={
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      }
                    />
                  }
                  // Limit how tall the dropdown can get (scroll if many items)
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 250, // pick any height you want
                      },
                    },
                  }}
                >
                  {(members || []).map((m) => (
                    <MenuItem
                      key={m.MemberID}
                      value={m.MemberID}
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {/* Wrap the name in a Tooltip to show it in full on hover */}
                      <Tooltip title={m.FullName}>
                        <Box component="span" sx={{ display: "inline-block", maxWidth: "100%" }}>
                          {m.FullName}
                        </Box>
                      </Tooltip>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Payment Date"
                    name="paymentDate"
                    type="date"
                    fullWidth
                    required
                    value={partialPayment.paymentDate}
                    onChange={(e) =>
                      setPartialPayment((prev) => ({ ...prev, paymentDate: e.target.value }))
                    }
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EventIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      name="method"
                      value={partialPayment.method}
                      onChange={(e) =>
                        setPartialPayment((prev) => ({ ...prev, method: e.target.value }))
                      }
                      input={
                        <OutlinedInput
                          label="Payment Method"
                          startAdornment={
                            <InputAdornment position="start">
                              <PaymentIcon />
                            </InputAdornment>
                          }
                        />
                      }
                    >
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="BDO">BDO</MenuItem>
                      <MenuItem value="BPI">BPI</MenuItem>
                      <MenuItem value="GCash">GCash</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      name="status"
                      value={partialPayment.status}
                      onChange={(e) =>
                        setPartialPayment((prev) => ({ ...prev, status: e.target.value }))
                      }
                      input={
                        <OutlinedInput
                          label="Payment Status"
                          startAdornment={
                            <InputAdornment position="start">
                              <InfoIcon />
                            </InputAdornment>
                          }
                        />
                      }
                    >
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="Failed">Failed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Total Amount"
                    name="amount"
                    type="number"
                    fullWidth
                    required
                    value={partialPayment.amount}
                    onChange={(e) =>
                      setPartialPayment((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography variant="body1">₱</Typography>
                        </InputAdornment>
                      ),
                    }}
                    helperText="Sum allocated to each invoice doesn't have to match exactly, depending on your logic."
                  />
                </Grid>
              </Grid>

              {/* Invoice Allocation */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Allocate to these Invoices</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Unpaid Invoices (select to add):
                    </Typography>
                    <Paper sx={{ maxHeight: 250, overflowY: "auto", p: 1 }}>
                      {unpaidInvoices.map((inv) => (
                        <Box
                          key={inv.invoiceId}
                          sx={{
                            mb: 1,
                            border: "1px solid #ccc",
                            p: 1,
                            borderRadius: 1,
                            cursor: "pointer",
                            "&:hover": { backgroundColor: "#f5f5f5" },
                          }}
                          onClick={() =>
                            handleAddInvoiceAlloc({
                              invoiceId: inv.invoiceId,
                              invoiceTotal: inv.invoiceTotal,
                            })
                          }
                        >
                          Invoice #{inv.invoiceId} for {inv.memberName} — ₱{inv.invoiceTotal} — {inv.paymentStatus}
                        </Box>
                      ))}
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Allocated Invoices:
                    </Typography>
                    <Paper sx={{ maxHeight: 250, overflowY: "auto", p: 1 }}>
                      {partialPayment.allocatedInvoices.map((alloc, idx) => (
                        <Box
                          key={`${alloc.invoiceId}-${idx}`}
                          sx={{ mb: 1, p: 1, border: "1px solid #ccc", borderRadius: 1 }}
                        >
                          Invoice #{alloc.invoiceId}
                          <TextField
                            label="Amount Allocated"
                            type="number"
                            size="small"
                            value={alloc.amountAllocated}
                            onChange={(e) => {
                              const newAlloc = [...partialPayment.allocatedInvoices];
                              newAlloc[idx].amountAllocated = e.target.value;
                              setPartialPayment((prev) => ({
                                ...prev,
                                allocatedInvoices: newAlloc,
                              }));
                            }}
                            sx={{ ml: 2, width: 100 }}
                          />
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              {/* Submit */}
              <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 3 }}>
                <Button variant="contained" color="primary" onClick={() => setOpenConfirmation(true)}>
                  <SaveIcon /> Submit Partial Payment
                </Button>
              </Box>
            </form>
          </Box>
        </DialogContent>
      </Dialog>

      {/* EDIT Payment Dialog */}
      <Dialog
        open={isEditPaymentOpen}
        onClose={() => setEditPaymentOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, boxShadow: 6, p: 3, overflow: "hidden" } }}
      >
        <DialogTitle sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MonetizationOnIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Edit Payment
              </Typography>
            </Box>
            <IconButton onClick={() => setEditPaymentOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <TextField
            fullWidth
            margin="normal"
            label="Payment ID"
            name="paymentId"
            variant="filled"
            InputProps={{ readOnly: true }}
            value={editPayment.paymentId || ""}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Member Name</InputLabel>
            <Select
              name="memberId"
              value={editPayment.memberId || ""}
              onChange={handleEditPaymentChange}
              label="Member Name"
            >
              <MenuItem value="">
                <em>-- Select Member --</em>
              </MenuItem>
              {members.map((m) => (
                <MenuItem key={m.MemberID} value={m.MemberID}>
                  {m.FullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            type="date"
            label="Payment Date"
            name="paymentDate"
            InputLabelProps={{ shrink: true }}
            value={editPayment.paymentDate ? editPayment.paymentDate.split("T")[0] : ""}
            onChange={handleEditPaymentChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Amount Paid"
            name="amountPaid"
            type="number"
            value={editPayment.amountPaid || ""}
            onChange={handleEditPaymentChange}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
            <InputLabel>Payment Method</InputLabel>
            <Select
              name="method"
              value={editPayment.method || ""}
              onChange={handleEditPaymentChange}
              label="Payment Method"
            >
              <MenuItem value="">-- Select Method --</MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="BDO">BDO</MenuItem>
              <MenuItem value="BPI">BPI</MenuItem>
              <MenuItem value="GCash">GCash</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Payment Status</InputLabel>
            <Select
              name="status"
              value={editPayment.status || ""}
              onChange={handleEditPaymentChange}
              label="Payment Status"
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Refunded">Refunded</MenuItem>
              <MenuItem value="Failed">Failed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
          <Button variant="contained" color="primary" onClick={handleEditPaymentSubmit}>
            <SaveIcon sx={{ mr: 1 }} /> Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW Payment Dialog */}
      <Dialog
        open={isViewPaymentOpen}
        onClose={() => setViewPaymentOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{ "& .MuiDialog-paper": { borderRadius: 3, boxShadow: 6, p: 3, overflow: "hidden" } }}
      >
        <DialogTitle sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MonetizationOnIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Payment Details
              </Typography>
            </Box>
            <IconButton onClick={() => setViewPaymentOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {viewPayment && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Payment ID"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={viewPayment.paymentId || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Payer Name"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={viewPayment.payerName || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Payment Date"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={
                    viewPayment.paymentDate
                      ? dayjs(viewPayment.paymentDate).format("YYYY-MM-DD")
                      : "—"
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Amount Paid"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={viewPayment.amountPaid ? `₱${viewPayment.amountPaid}` : "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Payment Method"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={viewPayment.method || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Status"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={viewPayment.status || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              {viewPayment.paymentFor && viewPayment.paymentFor.length > 0 && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Payment For"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={viewPayment.paymentFor.join(", ") || "—"}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD Invoice Dialog */}
      <Dialog open={isAddInvoiceOpen} onClose={() => setAddInvoiceOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              <ReceiptIcon sx={{ verticalAlign: "middle", mr: 1 }} />
              Add Invoice
            </Typography>
            <IconButton
              onClick={() => setAddInvoiceOpen(false)}
              sx={{
                color: "inherit",
                "&:hover": { color: "red" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2 }}>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={(e) => e.preventDefault()}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControl fullWidth required>
              <InputLabel>Member Name</InputLabel>
              <Select
                name="memberId"
                value={newInvoice.memberId || ""}
                onChange={handleAddInvoiceChange}
                input={
                  <OutlinedInput
                    label="Member Name"
                    startAdornment={
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    }
                  />
                }
                // 1) Limit how tall the dropdown can get
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 250 // pick any height you want
                    }
                  }
                }}
              >
                {(members || []).map((m) => (
                  <MenuItem
                    key={m.MemberID}
                    value={m.MemberID}
                    // 2) Truncate long text so it doesn't overflow
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.FullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

                <TextField
                  label="Invoice Date"
                  name="invoiceDate"
                  type="date"
                  fullWidth
                  required
                  value={newInvoice.invoiceDate}
                  onChange={handleAddInvoiceChange}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EventIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Due Date"
                  name="dueDate"
                  type="date"
                  fullWidth
                  required
                  value={newInvoice.dueDate}
                  onChange={handleAddInvoiceChange}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Total Amount"
                  name="invoiceTotal"
                  type="number"
                  fullWidth
                  required
                  value={newInvoice.invoiceTotal}
                  onChange={handleAddInvoiceChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="body1">₱</Typography>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setOpenConfirmation(true)}
                  disabled={
                    !newInvoice.memberId ||
                    !newInvoice.invoiceDate ||
                    !newInvoice.dueDate ||
                    !newInvoice.invoiceTotal ||
                    Number(newInvoice.invoiceTotal) <= 0
                  }
                  sx={{
                    textTransform: "none",
                    px: 4,
                    py: 1,
                  }}
                >
                  <SaveIcon sx={{ mr: 1 }} /> SAVE INVOICE
                </Button>
              </Box>
            </form>
          </Box>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG */}
      <Dialog
        open={openConfirmation}
        onClose={() => setOpenConfirmation(false)}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 350 },
        }}
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
          <Typography variant="body1">Are you sure you want to add this invoice?</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, py: 2 }}>
          <Button onClick={() => setOpenConfirmation(false)} sx={{ textTransform: "none" }} style={{ color: "red" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{ textTransform: "none" }}
            onClick={async () => {
              await handleAddInvoiceSubmit();
              setOpenConfirmation(false);
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT Invoice Dialog */}
      <Dialog
        open={isEditInvoiceOpen}
        onClose={() => setEditInvoiceOpen(false)}
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
              <ReceiptLongIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Edit Invoice
              </Typography>
            </Box>
            <IconButton onClick={() => setEditInvoiceOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <TextField
            fullWidth
            margin="normal"
            label="Invoice ID"
            name="invoiceId"
            variant="filled"
            InputProps={{ readOnly: true }}
            value={editInvoice.invoiceId || ""}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
            <InputLabel>Member Name</InputLabel>
            <Select
              name="memberId"
              value={editInvoice.memberId || ""}
              onChange={handleEditInvoiceChange}
            >
              {(members || []).map((m) => (
                <MenuItem key={m.MemberID} value={m.MemberID}>
                  {m.FullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            type="date"
            label="Invoice Date"
            name="invoiceDate"
            InputLabelProps={{ shrink: true }}
            value={editInvoice.invoiceDate || ""}
            onChange={handleEditInvoiceChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            margin="normal"
            type="date"
            label="Due Date"
            name="dueDate"
            InputLabelProps={{ shrink: true }}
            value={editInvoice.dueDate || ""}
            onChange={handleEditInvoiceChange}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Total Amount"
            name="invoiceTotal"
            type="number"
            value={editInvoice.invoiceTotal || ""}
            onChange={handleEditInvoiceChange}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
          <Button variant="contained" color="primary" onClick={handleEditInvoiceSubmit}>
            <SaveIcon sx={{ mr: 1 }} /> Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW Invoice Dialog */}
      <Dialog
        open={isViewInvoiceOpen}
        onClose={() => setViewInvoiceOpen(false)}
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
              <ReceiptLongIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Invoice Details
              </Typography>
            </Box>
            <IconButton onClick={() => setViewInvoiceOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {viewInvoice && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Invoice ID"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={viewInvoice.invoiceId || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Member Name"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={viewInvoice.memberName || "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Invoice Date"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={formatDate(viewInvoice.invoiceDate || "—")}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Due Date"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={formatDate(viewInvoice.dueDate || "—")}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Total Amount"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={viewInvoice.invoiceTotal ? `₱${viewInvoice.invoiceTotal}` : "—"}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          )}

          {/* Line Items */}
          <Box mt={3}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Line Items
            </Typography>
            {viewInvoice?.lineItems && viewInvoice.lineItems.length > 0 ? (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>Item Type</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Unit Price</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewInvoice.lineItems.map((li, index) => (
                      <TableRow key={index}>
                        <TableCell>{li.ItemType || "—"}</TableCell>
                        <TableCell>{li.Description || "—"}</TableCell>
                        <TableCell>{li.Quantity || "—"}</TableCell>
                        <TableCell>
                          {li.UnitPrice ? `₱${li.UnitPrice}` : "—"}
                        </TableCell>
                        <TableCell>
                          {li.Subtotal ? `₱${li.Subtotal}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography>No line items found.</Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* DELETE Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: "bold" }}>
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
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* NOTE Dialog */}
      <Dialog
        open={noteDialogOpen}
        onClose={closeEditNoteDialog}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 350 },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", p: 3 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Add Note
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: "center", py: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={noteData.note}
            onChange={(e) => setNoteData({ ...noteData, note: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, py: 2 }}>
          <Button onClick={closeEditNoteDialog} sx={{ textTransform: "none" }} style={{ color: "red" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{ textTransform: "none" }}
            onClick={handleSaveNote}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
