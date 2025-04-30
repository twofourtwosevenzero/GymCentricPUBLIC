import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  useTheme,
  Menu,
  InputAdornment,
  Snackbar,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Skeleton
} from '@mui/material';
import {
  Dashboard,
  Person,
  AttachMoney,
  People,
  DirectionsRun,
  NotificationImportant,
  AccountBalance,
  History as HistoryIcon,
  TrendingUp,
  ReceiptLong,
  TableView,
  AccountBalanceWallet,
  Savings,
  EditNote,
  Cancel,
  Save,
  MonetizationOn,
  FitnessCenter,
  LocalCafe,
  Icecream,
  CreditCard as CreditCardIcon,
  Store as StoreIcon,
  MonetizationOn as MonetizationOnIcon,
  DirectionsWalk,
  DirectionsWalk as DirectionsWalkIcon,
  AccountBalance as AccountBalanceIcon,
  Notes as NotesIcon,
  FileDownload as FileDownloadIcon,
  Close as CloseIcon,
  ReceiptLong as ReceiptLongIcon,
  MiscellaneousServices,
  Person as PersonIcon,
  EditNote as EditNoteIcon,
  Save as SaveIcon,
  Add,
  Event,
  Delete,
  Edit,
  MoreVert,
  PaymentOutlined,
  PersonAdd
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Line, Pie } from 'react-chartjs-2';
import AddIcon from '@mui/icons-material/Add';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Optional peso icon for tabs or anywhere you need a peso symbol
const PesosIcon = ({ fontSize = 24, color = 'inherit', sx = {} }) => (
  <Typography
    component="span"
    sx={{ fontWeight: 'bold', fontSize, color, mr: 0.5, display: 'inline-block', ...sx }}
  >
    ₱
  </Typography>
);

export default function OwnerDashboard(onClose) {
  const theme = useTheme();
  const darkMode = theme.palette.mode === 'dark';

  // ----------------- SNACKBAR STATES & HELPER (for success messages) -----------------
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [showPettyToday, setShowPettyToday] = useState(true);
  const [showPettyTomorrow, setShowPettyTomorrow] = useState(true);
  
  // [NEW STUFF] Overview Filters - moved from line 412
  const [overviewBranchFilter, setOverviewBranchFilter] = useState('all');
  const [overviewBizFilter, setOverviewBizFilter] = useState('all');
  const [consolidatedBranchFilter, setConsolidatedBranchFilter] = useState('all');
  
  // Member metrics state
  const [memberMetrics, setMemberMetrics] = useState({
    loginsToday: 0,
    renewalsToday: 0,
    renewalBreakdown: {
      plan1599: 0,
      plan1999: 0,
      otherPlans: 0
    },
    walkInsToday: 0,
    newSignUpsToday: 0,
    loggedInMembers: [],
    walkInDetails: [],
    newSignUpDetails: []
  });
  const [memberMetricsLoading, setMemberMetricsLoading] = useState(true);
  
// Example updated fetch function:
const fetchMemberMetrics = async (selectedBranch = 'all') => {
  try {
    setMemberMetricsLoading(true);
    console.log('Fetching member metrics for branch:', selectedBranch);
    
    // Check if user is authenticated
    const authResponse = await axios.get('/api/auth/check');
    if (!authResponse.data.authenticated) {
      console.error('User is not authenticated');
      // Redirect to login page or handle as needed
      window.location.href = '/login';
      return;
    }
    
    const response = await axios.get(`/owner/member-metrics?branch=${selectedBranch}`);
    console.log('Member metrics response:', response.data);
    
    // Log specific parts of the response for debugging
    console.log('loggedInMembers:', response.data.loggedInMembers);
    console.log('walkInDetails:', response.data.walkInDetails);
    console.log('newSignUpDetails:', response.data.newSignUpDetails);
    console.log('renewalDetails:', response.data.renewalDetails);
    
    setMemberMetrics(response.data);
  } catch (error) {
    console.error('Error fetching member metrics:', error);
    console.error('Error details:', error.response?.data || 'No response data');
    
    // Check if the error is due to authentication
    if (error.response && error.response.status === 401) {
      console.error('Authentication error, redirecting to login');
      window.location.href = '/login';
      return;
    }
    
    // Set default values to avoid showing 0 when there's an error
    setMemberMetrics({
      loginsToday: 0,
      renewalsToday: 0,
      renewalBreakdown: {
        plan1599: 0,
        plan1999: 0,
        otherPlans: 0
      },
      renewalDetails: {},
      walkInsToday: 0,
      newSignUpsToday: 0,
      loggedInMembers: [],
      walkInDetails: [],
      newSignUpDetails: []
    });
  } finally {
    setMemberMetricsLoading(false);
  }
};

// Fix 1: Adding a check to only call the API if selectedBranch changes
const fetchMemberMetricsRef = useRef(null);
useEffect(() => {
  if (fetchMemberMetricsRef.current !== overviewBranchFilter) {
    fetchMemberMetricsRef.current = overviewBranchFilter;
    fetchMemberMetrics(overviewBranchFilter);
  }
}, [overviewBranchFilter]);
  
  const showSuccessMessage = (message) => {
    setSnackMessage(message);
    setSnackOpen(true);
  };

  // Date/Time Helpers
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const dateObj = new Date(dateString);
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // CSV/PDF Exports
  const handleExportCSV = () => {
    handleExportMenuClose();
  };

  const handleExportPDF = () => {
    handleExportMenuClose();
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'A4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Load images from public folder (example only)
    const coverPage = '/imgs/coverpage.png';
    
    // Add Cover Page Background and header text
    doc.addImage(coverPage, 'PNG', 0, 0, pageWidth, pageHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor('#ffffff');
    doc.text('Cash Flow Report', pageWidth / 2, 100, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Generated on: ' + new Date().toLocaleDateString(), pageWidth / 2, 130, { align: 'center' });
    
    // Prepare Table Data
    const columns = [
      { title: 'Date', key: 'Date' },
      { title: 'Brch', key: 'BranchID' },
      { title: 'Type', key: 'BusinessType' },
      { title: 'Cash', key: 'CashSales' },
      { title: 'GCash', key: 'GCashSales' },
      { title: 'BPI', key: 'BPISales' },
      { title: 'BDO', key: 'BDOSales' },
      { title: 'W/Cash', key: 'WalkInCashSales' },
      { title: 'W/GCash', key: 'WalkInGCashSales' },
      { title: 'W/BPI', key: 'WalkInBPISales' },
      { title: 'W/BDO', key: 'WalkInBDOSales' },
      { title: 'Total', key: 'TotalSales' },
      { title: 'Exp', key: 'DailyExpenses' },
      { title: 'Net', key: 'NetProfit' },
      { title: 'Petty', key: 'PettyCash' },
      { title: 'Dpst', key: 'DepositedAmount' },
      { title: 'Rmks', key: 'Remarks' },
    ];
    
    const bodyData = filteredFlows.map((row) => ({
      Date: row.Date ? formatDate(row.Date) : 'N/A',
      BranchID: row.BranchID || '—',
      BusinessType: row.BusinessType || '',
      CashSales: Number(row.CashSales || 0).toFixed(2),
      GCashSales: Number(row.GCashSales || 0).toFixed(2),
      BPISales: Number(row.BPISales || 0).toFixed(2),
      BDOSales: Number(row.BDOSales || 0).toFixed(2),
      WalkInCashSales: Number(row.WalkInCashSales || 0).toFixed(2),
      WalkInGCashSales: Number(row.WalkInGCashSales || 0).toFixed(2),
      WalkInBPISales: Number(row.WalkInBPISales || 0).toFixed(2),
      WalkInBDOSales: Number(row.WalkInBDOSales || 0).toFixed(2),
      TotalSales: Number(row.TotalSales || 0).toFixed(2),
      DailyExpenses: Number(row.DailyExpenses || 0).toFixed(2),
      NetProfit: Number(row.NetProfit || 0).toFixed(2),
      PettyCash: Number(row.PettyCash || 0).toFixed(2),
      DepositedAmount: Number(row.DepositedAmount || 0).toFixed(2),
      Remarks: row.Remarks || '—',
    }));
    
    // Generate Table
    doc.autoTable({
      startY: 80,
      head: [columns.map((col) => col.title)],
      body: bodyData.map((data) => columns.map((col) => data[col.key])),
      theme: 'striped',
      headStyles: {
        fillColor: '#050505',
        textColor: '#ffffff',
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: '#333333',
      },
      alternateRowStyles: {
        fillColor: '#f5f5f5',
      },
      styles: {
        overflow: 'linebreak',
        cellPadding: 3,
        halign: 'center',
        valign: 'middle',
        fontSize: 8,
      },
      margin: { top: 50, left: 20, right: 20, bottom: 20 },
    });
    
    // Save the PDF
    doc.save('CashFlowReport.pdf');
  };

  // Export logic
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);
  const handleExportMenuOpen = (e) => setExportAnchorEl(e.currentTarget);
  const handleExportMenuClose = () => setExportAnchorEl(null);

  // Tabs
  const [selectedTab, setSelectedTab] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [activityTab, setActivityTab] = useState(0);
  const handleTabChange = (event, newValue) => setActiveTab(newValue);

  // Loading / Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Key metrics & logs
  const [keyMetrics, setKeyMetrics] = useState({
    totalRevenue: 0,
    totalEmailsSent: 0,
    totalClients: 0,
    trafficReceived: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [currentPromotions, setCurrentPromotions] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);

  // Branches & staff
  const [branchOptions, setBranchOptions] = useState([]);
  const [staff, setStaff] = useState([]);

  // Filters
  const [timePeriod, setTimePeriod] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Cash flow & expenses
  const [allFlows, setAllFlows] = useState([]);
  const [filteredFlows, setFilteredFlows] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);

  // Dialogs for cash flow
  const [cashFlowDialogOpen, setCashFlowDialogOpen] = useState(false);
  const [cashFlowForm, setCashFlowForm] = useState({
    BranchID: '',
    BusinessType: '',
    Date: '',
    CashSales: '',
    GCashSales: '',
    BPISales: '',
    BDOSales: '',
    WalkInCashSales: '',
    WalkInGCashSales: '',
    WalkInBPISales: '',
    WalkInBDOSales: '',
    DepositedAmount: '',
    PettyCash: '',
    Remarks: '',
    PettyCashTomorrow: '',   // [PETTY CASH TOMORROW] <-- new
  });

    // [NEW] Track whether we are editing or adding
  const [isEditingFlow, setIsEditingFlow] = useState(false);
  // [NEW] Store the ID of the flow we are editing (or null if creating)
  const [editingFlowId, setEditingFlowId] = useState(null);

  // Generate Gym daily flow
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Overall flow
  const [openOverallDialog, setOpenOverallDialog] = useState(false);
  const [overallInput, setOverallInput] = useState({ pettyDeduction: '', deposited: false });
  const [computedOverallTotal, setComputedOverallTotal] = useState(0);

  // Expense form
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    BranchID: '',
    ExpenseDate: '',
    ExpenseCategory: '',
    Amount: '',
    PaymentMethod: '',
    StaffID: '',
    Notes: '',
  });
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  function openAddExpenseDialog() {
    setExpenseForm({
      BranchID: '',
      ExpenseDate: '',
      ExpenseCategory: '',
      Amount: '',
      PaymentMethod: '',
      StaffID: '',
      Notes: '',
      BusinessType: '',
    });
    setIsEditingExpense(false);
    setEditingExpenseId(null);
    setExpenseFormOpen(true);
  }

  function openEditExpenseDialog(row) {
    setIsEditingExpense(true);
    setEditingExpenseId(row.ExpenseID);
  
    setExpenseForm({
      BranchID: row.BranchID?.toString() || '',
      ExpenseDate: row.ExpenseDate || '',
      ExpenseCategory: row.ExpenseCategory || '',
      Amount: String(row.Amount || ''),
      PaymentMethod: row.PaymentMethod || '',
      StaffID: row.StaffID || '',
      Notes: row.Notes || '',
      BusinessType: row.BusinessType || '',
    });
  
    setExpenseFormOpen(true);
  }

  // Consolidated
  const [consolidatedRows, setConsolidatedRows] = useState([]);
  const [selectedConsolidatedRow, setSelectedConsolidatedRow] = useState(null);
  const [pettyDialogOpen, setPettyDialogOpen] = useState(false);
  const [pettyForm, setPettyForm] = useState({
    pettyCash: '',
    depositedAmount: '',
    remarks: '',
  });
  
  // Charts
  const [cashFlows, setCashFlows] = useState([]);
  const [revenueChartData, setRevenueChartData] = useState(null);
  const [paymentMethodPie, setPaymentMethodPie] = useState(null);
  const [gymChartData, setGymChartData] = useState(null);
  const [cafeChartData, setCafeChartData] = useState(null);
  const [yogurtChartData, setYogurtChartData] = useState(null);
  const [yogurtCafeChartData, setYogurtCafeChartData] = useState(null);
  const [expenseChartData, setExpenseChartData] = useState(null);

  // Whether to include petty cash in the table (otherwise 0 or hidden)
  const [showPettyCash, setShowPettyCash] = useState(true);
  // Whether to include expenses in the table (otherwise 0 or hidden)
  const [showExpenses, setShowExpenses] = useState(true);

  // Payment filter & additional range
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('All');  
  const [netProfitChart, setNetProfitChart] = useState(null);
  const [bizFilter, setBizFilter] = useState('all'); 

  // ============== [Added: Petty for daily flows] =================
  const [dailyPettyOpen, setDailyPettyOpen] = useState(false); 
  const [selectedDailyFlow, setSelectedDailyFlow] = useState(null);
  const [dailyPettyForm, setDailyPettyForm] = useState({
    pettyCash: '',
    pettyCashTomorrow: '',  
    remarks: ''
  });
  // 1) A new piece of state for the sum of grandNet
  const [sumGrandNet, setSumGrandNet] = useState(0);
  const [sumGrandPetty, setSumGrandPetty] = useState(0);
  const [sumGrandExpenses, setSumGrandExpenses] = useState(0);
  
  const openDailyPettyDialog = (row) => {
    setSelectedDailyFlow(row);
    setDailyPettyForm({
      pettyCash: row.PettyCash ? String(row.PettyCash) : '',
      pettyCashTomorrow: row.petty_cash_tomorrow ? String(row.petty_cash_tomorrow) : '',      
      remarks: ''
    });
    setDailyPettyOpen(true);
  };
  
  const closeDailyPettyDialog = () => {
    setDailyPettyOpen(false);
    setSelectedDailyFlow(null);
  };

  function handleDailyPettyChange(e) {
    const { name, value } = e.target;
    setDailyPettyForm((prev) => ({ ...prev, [name]: value }));
  }
  
  const handleSubmitDailyPetty = async () => {
    try {
      if (!selectedDailyFlow) return;
  
      // Fix 2: Remove pettyVal and pettyTmrVal calculation that references undefined variables
      // and use the form values directly
      const pettyVal = parseFloat(dailyPettyForm.pettyCash) || 0;      
      const pettyTmrVal = parseFloat(dailyPettyForm.pettyCashTomorrow) || 0;
  
      await axios.put(`/finance/cashflow/${selectedDailyFlow.CashFlowID}`, {
        BranchID: selectedDailyFlow.BranchID,
        Date: selectedDailyFlow.Date,
        BusinessType: selectedDailyFlow.BusinessType,
      
        // Keep existing sales values from selectedDailyFlow:
        CashSales: selectedDailyFlow.CashSales,
        GCashSales: selectedDailyFlow.GCashSales,
        BPISales: selectedDailyFlow.BPISales,
        BDOSales: selectedDailyFlow.BDOSales,
      
        // Update the petty fields only:
        PettyCash: pettyVal,
        PettyCashTomorrow: pettyTmrVal,
        Remarks: dailyPettyForm.remarks
      });
  
      showSuccessMessage('Petty Cash set for ' + selectedDailyFlow.BusinessType);
      setDailyPettyOpen(false);
      setSelectedDailyFlow(null);
  
      // refresh flows
      const cfRes = await axios.get('/finance/cashflow');
      const flows = cfRes.data.flows || [];
      setAllFlows(flows);
  
      // re-apply filter
      const newFiltered = applyDateFilter(flows, dateFrom, dateTo);
      setFilteredFlows(newFiltered);
    } catch (err) {
      console.error(err);
      alert('Failed to set petty cash in daily flow');
    }
  };
  

  // ============== Data loading & setup ==============
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. branches & staff
        const [branchRes, staffRes] = await Promise.all([
          axios.get('/owner/branches'),
          axios.get('/staff'),
        ]);
        const bOptions = branchRes.data.branches.map((b) => ({
          value: b.BranchID.toString(),
          label: b.BranchName,
        }));
        setBranchOptions([{ value: 'all', label: 'All Branches' }, ...bOptions]);
        setStaff(staffRes.data.staff || staffRes.data || []);

        // 2. key metrics
        const metricsRes = await axios.get(
          `/owner/dashboard-metrics?period=${timePeriod}&dateFrom=${dateFrom}&dateTo=${dateTo}&branch=all`
        );
        setKeyMetrics(metricsRes.data.metrics);

        // 3. promos & logs
        const [promoRes, logsRes] = await Promise.all([
          axios.get('/finance/promotions'),
          axios.get('/system/logs'),
        ]);
        setCurrentPromotions(promoRes.data.promos);
        setSystemLogs(logsRes.data.logs);

        // 4. recent transactions
        const paymentsRes = await axios.get('/payments');
        const transactions = paymentsRes.data.map((p) => {
          let payer = '';
          if (p.monthly_client && p.monthly_client.FullName) {
            payer = p.monthly_client.FullName;
          } else if (p.member && p.member.FullName) {
            payer = p.member.FullName;
          } else if (p.PayerName) {
            payer = p.PayerName;
          } else if (p.WalkInName) {
            payer = p.WalkInName;
          } else {
            payer = 'Walk-In';
          }
          
          return {
            id: p.PaymentID,
            payer, // aggregated value
            amount: p.Amount,
            method: p.PaymentMethod,
            date: p.PaymentDate,
            status: p.Status,
          };
        });
        
        setRecentTransactions(transactions);

        // 5. flows & expenses
        const [cashflowRes, expRes] = await Promise.all([
          axios.get('/finance/cashflow'),
          axios.get('/finance/expenses'),
        ]);
        const flows = cashflowRes.data.flows || [];
        const allExp = expRes.data.expenses || [];
        setAllFlows(flows);
        setFilteredFlows(flows);
        setAllExpenses(allExp);
        setFilteredExpenses(allExp);

        // 6. build charts
        buildRevenueTrends(flows);
        buildPaymentPie(flows);
        buildBusinessCharts(flows);
        buildExpenseChart(allExp);
        buildConsolidatedRows(flows, allExp, paymentFilter);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load data from server.');
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild consolidated if flows/expenses/paymentFilter change
  const consolidatedDepsRef = useRef({
    flows: null,
    expenses: null,
    showPettyCash: null,
    showExpenses: null,
    paymentFilter: null,
    bizFilter: null,
    consolidatedBranchFilter: null
  });
  
  useEffect(() => {
    // Check if any dependencies have actually changed before rebuilding
    const currentDeps = {
      flows: filteredFlows,
      expenses: filteredExpenses,
      showPettyCash,
      showExpenses,
      paymentFilter,
      bizFilter,
      consolidatedBranchFilter
    };
    
    const hasChanged = Object.keys(currentDeps).some(
      key => currentDeps[key] !== consolidatedDepsRef.current[key]
    );
    
    if (hasChanged) {
      consolidatedDepsRef.current = { ...currentDeps };
      buildConsolidatedRows(filteredFlows, filteredExpenses);
    }
  }, [filteredFlows, filteredExpenses, showPettyCash, showExpenses, paymentFilter, bizFilter, consolidatedBranchFilter]);

    const consolidatedColumns = useMemo(() => {
      return getDynamicConsolidatedColumns();
    }, [showPettyToday, showPettyTomorrow, showExpenses, bizFilter]);

  // ======================== Chart Builders ========================
  const buildRevenueTrends = (flows) => {
    const sorted = [...flows].sort((a, b) => new Date(a.Date) - new Date(b.Date));
    setCashFlows(sorted);
    setRevenueChartData({
      labels: sorted.map((f) => f.Date),
      datasets: [
        {
          label: 'Revenue',
          data: sorted.map((f) => Number(f.TotalSales || 0)),
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.primary.light,
          fill: false,
        },
      ],
    });
  };

  const formatCurrency = (value) => {
    if (value == null || value === '') return '—';
    return `${parseInt(value).toLocaleString('en-PH')}`;
  };

  const buildPaymentPie = (flows) => {
    let cash = 0,
      gcash = 0,
      bpi = 0,
      bdo = 0;
    flows.forEach((f) => {
      cash += parseFloat(f.CashSales || 0) + parseFloat(f.WalkInCashSales || 0);
      gcash += parseFloat(f.GCashSales || 0) + parseFloat(f.WalkInGCashSales || 0);
      bpi += parseFloat(f.BPISales || 0) + parseFloat(f.WalkInBPISales || 0);
      bdo += parseFloat(f.BDOSales || 0) + parseFloat(f.WalkInBDOSales || 0);
    });
    setPaymentMethodPie({
      labels: ['Cash', 'GCash', 'BPI', 'BDO'],
      datasets: [
        {
          data: [cash, gcash, bpi, bdo],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#FF9F40'],
        },
      ],
    });
  };

  const buildBusinessCharts = (flows) => {
    const gym = flows.filter((f) => f.BusinessType === 'Gym');
    const cafe = flows.filter((f) => f.BusinessType === 'Cafe');
    const yogurt = flows.filter((f) => f.BusinessType === 'Yogurt');
    const yogurtCafe = flows.filter((f) => f.BusinessType === 'Yogurt Cafe');

    function buildChart(arr, label) {
      const grouped = arr.reduce((acc, f) => {
        const d = f.Date;
        if (!acc[d]) {
          acc[d] = { cash: 0, gcash: 0, bpi: 0, bdo: 0 };
        }
        acc[d].cash += parseFloat(f.CashSales || 0) + parseFloat(f.WalkInCashSales || 0);
        acc[d].gcash += parseFloat(f.GCashSales || 0) + parseFloat(f.WalkInGCashSales || 0);
        acc[d].bpi += parseFloat(f.BPISales || 0) + parseFloat(f.WalkInBPISales || 0);
        acc[d].bdo += parseFloat(f.BDOSales || 0) + parseFloat(f.WalkInBDOSales || 0);
        return acc;
      }, {});
      const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
      return {
        labels: sortedDates,
        datasets: [
          {
            label: `${label} - Cash`,
            data: sortedDates.map((d) => grouped[d].cash),
            borderColor: '#4BC0C0',
            backgroundColor: 'rgba(75,192,192,0.2)',
            fill: true,
          },
          {
            label: `${label} - GCash`,
            data: sortedDates.map((d) => grouped[d].gcash),
            borderColor: '#9966FF',
            backgroundColor: 'rgba(153,102,255,0.2)',
            fill: true,
          },
          {
            label: `${label} - BPI`,
            data: sortedDates.map((d) => grouped[d].bpi),
            borderColor: '#FFCE56',
            backgroundColor: 'rgba(255,206,86,0.2)',
            fill: true,
          },
          {
            label: `${label} - BDO`,
            data: sortedDates.map((d) => grouped[d].bdo),
            borderColor: '#FF9F40',
            backgroundColor: 'rgba(255,159,64,0.2)',
            fill: true,
          },
        ],
      };
    }

    setGymChartData(buildChart(gym, 'Gym'));
    setCafeChartData(buildChart(cafe, 'Cafe'));
    setYogurtChartData(buildChart(yogurt, 'Yogurt'));
    setYogurtCafeChartData(buildChart(yogurtCafe, 'Yogurt Cafe'));
  };

  const buildExpenseChart = (expenses) => {
    const grouped = expenses.reduce((acc, e) => {
      const d = (e.ExpenseDate || '').slice(0, 10);
      if (!acc[d]) acc[d] = 0;
      acc[d] += parseFloat(e.Amount || 0);
      return acc;
    }, {});
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
    setExpenseChartData({
      labels: sortedDates,
      datasets: [
        {
          label: 'Daily Expenses',
          data: sortedDates.map((d) => grouped[d]),
          borderColor: '#f55d5d',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
        },
      ],
    });
  };

    // ======================== EXPENSES & FLOWS TABLES ========================
    const expenseColumns = [
      {
        field: 'ExpenseDate',
        headerName: 'Date',
        width: 180,
        renderCell: (params) => (params.value ? formatDate(params.value) : '—'),
      },
      {
        field: 'BranchID',
        headerName: 'Branch',
        width: 100,
      },
      {
        field: 'BusinessType',
        headerName: 'Biz Type',
        width: 120
      },
      {
        field: 'ExpenseCategory',
        headerName: 'Category',
        width: 140,
      },
      {
        field: 'Amount',
        headerName: 'Amount',
        width: 100,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'PaymentMethod',
        headerName: 'Method',
        width: 100,
      },
      {
        field: 'StaffID',
        headerName: 'Staff ID',
        width: 80,
      },
      {
        field: 'Notes',
        headerName: 'Notes',
        width: 160,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 180,
        renderCell: (params) => {
          const row = params.row;
          return (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" onClick={() => openEditExpenseDialog(row)}>
                Edit
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => handleDeleteExpense(row)}
              >
                Delete
              </Button>
            </Box>
          );
        },
      },
    ];
  
    const expenseRows = filteredExpenses.map((exp) => ({
      // Use the DB's ExpenseID as the unique key in DataGrid
      id: exp.ExpenseID,
      ExpenseID: exp.ExpenseID, // store it explicitly if you like
      ExpenseDate: exp.ExpenseDate || '',
      BranchID: exp.BranchID || '',
      BusinessType: exp.BusinessType || '',
      ExpenseCategory: exp.ExpenseCategory || '',
      Amount: parseFloat(exp.Amount || 0),
      PaymentMethod: exp.PaymentMethod || '',
      StaffID: exp.StaffID || '',
      Notes: exp.Notes || '',
    }));
      
    const handleExpenseChange = (e) => {
      const { name, value } = e.target;
      setExpenseForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmitExpense = async () => {
      try {
        if (!isEditingExpense) {
          // 1) CREATE
          await axios.post('/finance/expenses', {
            ...expenseForm,
            Amount: parseFloat(expenseForm.Amount || 0),
          });
          showSuccessMessage('Expense created successfully!');
        } else {
          // 2) EDIT/UPDATE
          const payload = {
            ...expenseForm,
            Amount: parseFloat(expenseForm.Amount || 0),
          };
          await axios.put(`/finance/expenses/${editingExpenseId}`, payload);
          showSuccessMessage('Expense updated successfully!');
        }

        // Refresh from server
        const expRes = await axios.get('/finance/expenses');
        const allExp = expRes.data.expenses || [];
        setAllExpenses(allExp);

        // Filter + rebuild chart
        const newFiltered = applyDateFilter(allExp, dateFrom, dateTo);
        setFilteredExpenses(newFiltered);
        buildExpenseChart(allExp);

        // Close form & reset
        setExpenseFormOpen(false);
        setIsEditingExpense(false);
        setEditingExpenseId(null);
      } catch (err) {
        console.error(err);
        alert(isEditingExpense ? 'Error updating expense.' : 'Error creating expense.');
      }
    };

    async function handleDeleteExpense(row) {
      const confirmed = window.confirm('Are you sure you want to delete this expense?');
      if (!confirmed) return;
    
      try {
        await axios.delete(`/finance/expenses/${row.ExpenseID}`);
        showSuccessMessage('Expense deleted successfully!');
    
        // Refresh from server
        const expRes = await axios.get('/finance/expenses');
        const allExp = expRes.data.expenses || [];
        setAllExpenses(allExp);
    
        // Filter + rebuild chart
        const newFiltered = applyDateFilter(allExp, dateFrom, dateTo);
        setFilteredExpenses(newFiltered);
        buildExpenseChart(allExp);
      } catch (err) {
        console.error(err);
        alert('Error deleting expense. Check console.');
      }
    }
    

    async function handleDeleteFlow(row) {
      const confirm = window.confirm('Are you sure you want to delete this entry?');
      if (!confirm) return;
    
      try {
        // row.CashFlowID (or row.id if you used that)
        await axios.delete(`/finance/cashflow/${row.CashFlowID}`);
        showSuccessMessage('Cash flow entry deleted!');
    
        // Re-fetch & refresh UI
        const cfRes = await axios.get('/finance/cashflow');
        const flows = cfRes.data.flows || [];
        setAllFlows(flows);
        const newFiltered = applyDateFilter(flows, dateFrom, dateTo);
        setFilteredFlows(newFiltered);
        buildRevenueTrends(newFiltered);
        buildPaymentPie(newFiltered);
        buildBusinessCharts(newFiltered);
      } catch (err) {
        console.error(err);
        alert('Failed to delete the entry.');
      }
    }
    
    // Add PettyCashTomorrow so it displays in the DataGrid
    const flowColumns = [
      {
        field: 'Date',
        headerName: 'Date',
        width: 150,
        renderCell: (params) => (params.value ? formatDate(params.value) : '—'),
      },
      {
        field: 'BranchID',
        headerName: 'Branch',
        width: 80,
      },
      {
        field: 'BusinessType',
        headerName: 'Type',
        width: 110,
      },
      {
        field: 'CashSales',
        headerName: 'Cash',
        width: 80,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'PettyCash',
        headerName: 'PC(Today)',
        width: 100,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'CashPlusPetty',
        headerName: 'Cash+PC Today',
        width: 120,
        // optional formatting
        renderCell: (params) => `₱${params.value.toLocaleString()}`
      },
      {
        field: 'PettyCashTomorrow',
        headerName: 'PC(Tomorrow)',
        width: 130,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'GCashSales',
        headerName: 'GCash',
        width: 80,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'BPISales',
        headerName: 'BPI',
        width: 80,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'BDOSales',
        headerName: 'BDO',
        width: 80,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'TotalGross',
        headerName: 'Total Gross',
        width: 110,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'TotalGrossMinusPetty',
        headerName: 'Gross - PC(Tomorrow)',
        width: 120,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'TotalGrossMinusExpenses',
        headerName: 'Gross - Expenses',
        width: 140,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'TakeHome',
        headerName: 'Take Home',
        width: 110,
        renderCell: (params) => formatCurrency(params.value),
      },
      {
        field: 'Remarks',
        headerName: 'Remarks',
        width: 160,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 250,
        renderCell: (params) => {
          const row = params.row;
          return (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => handleDeleteFlow(row)}
              >
                Delete
              </Button>
            </Box>
          );
        },
      },
    ];

    const flowRows = filteredFlows.map((flow) => {
      // 1. Parse main payment values (pure sales only, ignoring petty)
      const flowCash  = parseFloat(flow.CashSales || 0) + parseFloat(flow.WalkInCashSales || 0);
      const flowGCash = parseFloat(flow.GCashSales || 0) + parseFloat(flow.WalkInGCashSales || 0);
      const flowBPI   = parseFloat(flow.BPISales || 0)   + parseFloat(flow.WalkInBPISales || 0);
      const flowBDO   = parseFloat(flow.BDOSales || 0)   + parseFloat(flow.WalkInBDOSales || 0);

      // 2. Daily expenses for each payment method
      const dailyCashExpenses = allExpenses
        .filter((exp) =>
          exp.BranchID == flow.BranchID &&
          exp.BusinessType === flow.BusinessType &&
          (exp.ExpenseDate || '').slice(0, 10) === (flow.Date || '').slice(0, 10) &&
          exp.PaymentMethod === 'Cash'
        )
        .reduce((sum, e) => sum + parseFloat(e.Amount || 0), 0);

      const dailyGCashExpenses = allExpenses
        .filter((exp) =>
          exp.BranchID == flow.BranchID &&
          exp.BusinessType === flow.BusinessType &&
          (exp.ExpenseDate || '').slice(0, 10) === (flow.Date || '').slice(0, 10) &&
          exp.PaymentMethod === 'GCash'
        )
        .reduce((sum, e) => sum + parseFloat(e.Amount || 0), 0);

      const dailyBPIExpenses = allExpenses
        .filter((exp) =>
          exp.BranchID == flow.BranchID &&
          exp.BusinessType === flow.BusinessType &&
          (exp.ExpenseDate || '').slice(0, 10) === (flow.Date || '').slice(0, 10) &&
          exp.PaymentMethod === 'BPI'
        )
        .reduce((sum, e) => sum + parseFloat(e.Amount || 0), 0);

      const dailyBDOExpenses = allExpenses
        .filter((exp) =>
          exp.BranchID == flow.BranchID &&
          exp.BusinessType === flow.BusinessType &&
          (exp.ExpenseDate || '').slice(0, 10) === (flow.Date || '').slice(0, 10) &&
          exp.PaymentMethod === 'BDO'
        )
        .reduce((sum, e) => sum + parseFloat(e.Amount || 0), 0);

      const totalExpenses = dailyCashExpenses + dailyGCashExpenses + dailyBPIExpenses + dailyBDOExpenses;

      // 3. Petty cash values
      const pettyCash      = parseFloat(flow.PettyCash || 0);
      const pettyTomorrow  = parseFloat(flow.PettyCashTomorrow || 0);

      // 4. "Cash + Petty" column (optional)
      const cashPlusPetty  = flowCash + pettyCash;

      // 5. Total Gross = (Cash + Petty) + (GCash + BPI + BDO)
      const totalGross = cashPlusPetty + flowGCash + flowBPI + flowBDO;

      // 6. If your business logic subtracts "tomorrow's petty" from net:
      const TotalGrossMinusPetty    = totalGross - pettyTomorrow;
      const TotalGrossMinusExpenses = totalGross - totalExpenses;
      const takeHome                = totalGross - pettyTomorrow - totalExpenses;

      // 7. Return the row object for DataGrid
      return {
        id: flow.CashFlowID,
        CashFlowID: flow.CashFlowID,
        Date: flow.Date || '',
        BranchID: flow.BranchID || '',
        BusinessType: flow.BusinessType || '',

        // Pure daily cash (no petty)
        CashSales: flowCash,

        // The new combined field (Cash + Petty)
        CashPlusPetty: cashPlusPetty,

        // Other payment methods
        GCashSales: flowGCash,
        BPISales: flowBPI,
        BDOSales: flowBDO,

        // Totals & net logic
        TotalGross: totalGross,
        TotalGrossMinusPetty,
        TotalGrossMinusExpenses,
        TakeHome: takeHome,

        // Petty columns
        PettyCash: pettyCash,
        PettyCashTomorrow: pettyTomorrow,

        Remarks: flow.Remarks || '',
      };
    });

  
  
    // ======================== Cash Flow CRUD ========================
    const handleOpenCashFlowDialog = () => {
      setCashFlowForm({
        BranchID: '',
        BusinessType: '',
        Date: '',
        CashSales: '',
        GCashSales: '',
        BPISales: '',
        BDOSales: '',
        WalkInCashSales: '',
        WalkInGCashSales: '',
        WalkInBPISales: '',
        WalkInBDOSales: '',
        DepositedAmount: '',
        PettyCash: '',
        Remarks: '',
      });
        // Mark that we are NOT editing an existing record
        setIsEditingFlow(false);
        setEditingFlowId(null);
        // Show dialog
      setCashFlowDialogOpen(true);
    };
    
    function openEditFlowDialog(row) {
      setIsEditingFlow(true);
      setEditingFlowId(row.CashFlowID); // or row.id if you used row.id = flow.CashFlowID
    
      // Pre-fill the dialog form with the existing row data
      setCashFlowForm({
        BranchID: row.BranchID?.toString() || '',
        BusinessType: row.BusinessType || '',
        Date: row.Date || '',
        CashSales: row.CashSales?.toString() || '',
        GCashSales: row.GCashSales?.toString() || '',
        BPISales: row.BPISales?.toString() || '',
        BDOSales: row.BDOSales?.toString() || '',
        WalkInCashSales: '0',
        WalkInGCashSales: '0',
        WalkInBPISales: '0',
        WalkInBDOSales: '0',
        DepositedAmount: '0',
        PettyCash: '0', // or row.PettyCash?.toString() if you want to allow editing petty
        Remarks: row.Remarks || '',
      });
      // Now open the dialog
      setCashFlowDialogOpen(true);
    }
    
    const handleCloseCashFlowDialog = () => setCashFlowDialogOpen(false);

    const handleCashFlowChange = (e) => {
      const { name, value } = e.target;
      setCashFlowForm((prev) => ({ ...prev, [name]: value }));
    };

  const handleCashFlowSubmit = async () => {
    try {
      if (!isEditingFlow) {
        // ================ CREATE Logic ================
        const payload = {
          ...cashFlowForm,
          CashSales:        Number(cashFlowForm.CashSales || 0),
          GCashSales:       Number(cashFlowForm.GCashSales || 0),
          BPISales:         Number(cashFlowForm.BPISales   || 0),
          BDOSales:         Number(cashFlowForm.BDOSales   || 0),
          WalkInCashSales:  Number(cashFlowForm.WalkInCashSales  || 0),
          WalkInGCashSales: Number(cashFlowForm.WalkInGCashSales || 0),
          WalkInBPISales:   Number(cashFlowForm.WalkInBPISales   || 0),
          WalkInBDOSales:   Number(cashFlowForm.WalkInBDOSales   || 0),
          DepositedAmount:  Number(cashFlowForm.DepositedAmount  || 0),
          PettyCash:        Number(cashFlowForm.PettyCash        || 0),
          PettyCashTomorrow: Number(cashFlowForm.PettyCashTomorrow || 0), // [PETTY CASH TOMORROW]
        };
        await axios.post('/finance/cashflow', payload);
        showSuccessMessage('Daily cash flow entry created successfully!');
      } else {
        // ================ UPDATE Logic ================
        const payload = {
          BranchID:        cashFlowForm.BranchID,
          BusinessType:    cashFlowForm.BusinessType,
          Date:            cashFlowForm.Date,
          CashSales:       Number(cashFlowForm.CashSales || 0),
          GCashSales:      Number(cashFlowForm.GCashSales || 0),
          BPISales:        Number(cashFlowForm.BPISales   || 0),
          BDOSales:        Number(cashFlowForm.BDOSales   || 0),
          WalkInCashSales:  Number(cashFlowForm.WalkInCashSales   || 0), // or keep if you want to edit them
          WalkInGCashSales: Number(cashFlowForm.WalkInGCashSales || 0),
          WalkInBPISales:   Number(cashFlowForm.WalkInBPISales   || 0),
          WalkInBDOSales:   Number(cashFlowForm.WalkInBDOSales   || 0),
          DepositedAmount:  Number(cashFlowForm.DepositedAmount  || 0),
          PettyCash:       Number(cashFlowForm.PettyCash        || 0),
          PettyCashTomorrow: Number(cashFlowForm.PettyCashTomorrow || 0),
          Remarks:         cashFlowForm.Remarks || '',
        };
        await axios.put(`/finance/cashflow/${editingFlowId}`, payload);
        showSuccessMessage('Daily cash flow entry updated successfully!');
      }

      // re-fetch & refresh
      const cfRes = await axios.get('/finance/cashflow');
      const flows = cfRes.data.flows || [];
      setAllFlows(flows);
      const newFiltered = applyDateFilter(flows, dateFrom, dateTo);
      setFilteredFlows(newFiltered);
      buildRevenueTrends(newFiltered);
      buildPaymentPie(newFiltered);
      buildBusinessCharts(newFiltered);

      setCashFlowDialogOpen(false);
      setIsEditingFlow(false);
      setEditingFlowId(null);
    } catch (err) {
      console.error(err);
      alert(isEditingFlow
        ? 'Failed to update cash flow entry.'
        : 'Failed to create daily cash flow entry.'
      );
    }
  };
    
    const handleGenerateCashFlow = async () => {
      try {
        const formatted = selectedDate.toISOString().substring(0, 10);
        await axios.post('/finance/generate-cashflow', {
          date: formatted,
          branch_id: selectedBranchId,
        });
        showSuccessMessage('Gym daily cash flow generated!');
        handleFilterCashFlow();
      } catch (err) {
        console.error(err);
        alert('Failed to generate gym daily flow');
      }
    };
  
    // ============== Overall Flow ==============
    const handleOpenOverallDialog = () => {
      const today = new Date().toISOString().substring(0, 10);
      const overallTotal = allFlows
        .filter((f) => f.Date === today && f.BusinessType !== 'Overall')
        .reduce((sum, f) => sum + parseFloat(f.TotalSales || 0), 0);
      setComputedOverallTotal(overallTotal);
      setOpenOverallDialog(true);
    };
    const handleCloseOverallDialog = () => {
      setOpenOverallDialog(false);
      setOverallInput({ pettyDeduction: '', deposited: false });
    };
    const handleOverallInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      setOverallInput((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    const handleSubmitOverallFlow = async () => {
      const petty = parseFloat(overallInput.pettyDeduction) || 0;
      const finalTotal = computedOverallTotal - petty;
      try {
        await axios.post('/finance/cashflow', {
          BranchID: branchOptions[0]?.value || 1,
          Date: new Date().toISOString().substring(0, 10),
          BusinessType: 'Overall',
          CashSales: 0,
          GCashSales: 0,
          BPISales: 0,
          BDOSales: 0,
          WalkInCashSales: 0,
          WalkInGCashSales: 0,
          WalkInBPISales: 0,
          WalkInBDOSales: 0,
          TotalSales: finalTotal,
          PettyCash: petty,
          DepositedAmount: overallInput.deposited ? finalTotal : 0,
          Remarks: overallInput.deposited
            ? 'Overall flow generated; money deposited to owner.'
            : 'Overall flow generated; pending deposit.',
        });
        showSuccessMessage('Overall daily cash flow record created successfully!');
        handleCloseOverallDialog();
        const cfRes = await axios.get('/finance/cashflow');
        const flows = cfRes.data.flows || [];
        setAllFlows(flows);
        const newFiltered = applyDateFilter(flows, dateFrom, dateTo);
        setFilteredFlows(newFiltered);
        buildRevenueTrends(newFiltered);
        buildPaymentPie(newFiltered);
        buildBusinessCharts(newFiltered);
      } catch (err) {
        console.error(err);
        alert('Failed to create overall daily cash flow record.');
      }
    };

  // ======================== Consolidated Logic ========================
  function applyDateFilter(arr, start, end) {
    if (!start && !end) return arr;
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return arr.filter((f) => {
      const d = new Date(f.ExpenseDate || f.Date);
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  }

  const handleFilterCashFlow = () => {
    const newFiltered = applyDateFilter(allFlows, dateFrom, dateTo);
    setFilteredFlows(newFiltered);
    buildRevenueTrends(newFiltered);
    buildPaymentPie(newFiltered);
    buildBusinessCharts(newFiltered);
  };

  const handleFilterExpenses = () => {
    const newFiltered = applyDateFilter(allExpenses, dateFrom, dateTo);
    setFilteredExpenses(newFiltered);
  };

function buildConsolidatedRows(flows, expenses) {

// First, filter by branch if not 'all'
  let relevantFlows = flows;
  let relevantExpenses = expenses;
  if (consolidatedBranchFilter !== 'all') {
    relevantFlows = flows.filter((f) => String(f.BranchID) === String(consolidatedBranchFilter));
    relevantExpenses = expenses.filter((e) => String(e.BranchID) === String(consolidatedBranchFilter));
  }

  const groupedByDay = {};

  relevantFlows.forEach((flow) => {
    const dateKey = (flow.Date || '').slice(0, 10);

    // Initialize the day if needed
    if (!groupedByDay[dateKey]) {
      groupedByDay[dateKey] = {
        Gym:          { gross: 0, pettyToday: 0, pettyTomorrow: 0, expenses: 0 },
        Cafe:         { gross: 0, pettyToday: 0, pettyTomorrow: 0, expenses: 0 },
        Yogurt:       { gross: 0, pettyToday: 0, pettyTomorrow: 0, expenses: 0 },
        'Yogurt Cafe':{ gross: 0, pettyToday: 0, pettyTomorrow: 0, expenses: 0 },
      };
    }

    // 1) Compute "gross" based on paymentFilter
    let gross = 0;
    if (paymentFilter === 'all') {
      gross = parseFloat(flow.TotalSales || 0);
    } else {
      const csh = parseFloat(flow.CashSales || 0) + parseFloat(flow.WalkInCashSales || 0);
      const gch = parseFloat(flow.GCashSales || 0) + parseFloat(flow.WalkInGCashSales || 0);
      const bpi = parseFloat(flow.BPISales || 0) + parseFloat(flow.WalkInBPISales || 0);
      const bdo = parseFloat(flow.BDOSales || 0) + parseFloat(flow.WalkInBDOSales || 0);

      if (paymentFilter === 'Cash')  gross = csh;
      if (paymentFilter === 'GCash') gross = gch;
      if (paymentFilter === 'BPI')   gross = bpi;
      if (paymentFilter === 'BDO')   gross = bdo;
    }

    // 2) Petty values based on toggles
    const pettyTodayVal = showPettyToday ? parseFloat(flow.PettyCash || 0) : 0;
    const pettyTomorrowVal = showPettyTomorrow ? parseFloat(flow.PettyCashTomorrow || 0) : 0;

    // 3) Add to aggregator only if BusinessType is one of our 4
    const biz = flow.BusinessType;
    if (biz && groupedByDay[dateKey][biz]) {
      groupedByDay[dateKey][biz].gross += gross;
      groupedByDay[dateKey][biz].pettyToday += pettyTodayVal;
      groupedByDay[dateKey][biz].pettyTomorrow += pettyTomorrowVal;
    }
  });

  // 4) Add expenses if showExpenses is true
  if (showExpenses) {
    relevantExpenses.forEach((exp) => {
      const dateKey = (exp.ExpenseDate || '').slice(0, 10);
      if (!groupedByDay[dateKey]) return;

      const biz = exp.BusinessType; // 'Gym', 'Cafe', etc.
      if (!biz || !groupedByDay[dateKey][biz]) return;

      if (paymentFilter !== 'all' && exp.PaymentMethod !== paymentFilter) return;
      groupedByDay[dateKey][biz].expenses += parseFloat(exp.Amount || 0);
    });
  }

  // 5) Build final row objects
  const resultRows = Object.keys(groupedByDay)
    .sort((a, b) => new Date(a) - new Date(b))
    .map((dt, idx) => {
      // For each business, compute net as:
      // net = gross + pettyToday - pettyTomorrow - expenses
      function finalizeBiz(bizName) {
        const rec = groupedByDay[dt][bizName];
        const netVal = rec.gross + rec.pettyToday - rec.pettyTomorrow - rec.expenses;
        return {
          gross: rec.gross,
          pettyToday: rec.pettyToday,
          pettyTomorrow: rec.pettyTomorrow,
          expenses: rec.expenses,
          net: netVal,
        };
      }

      const gym    = finalizeBiz('Gym');
      const cafe   = finalizeBiz('Cafe');
      const yogurt = finalizeBiz('Yogurt');
      const yCafe  = finalizeBiz('Yogurt Cafe');

      // Grand totals: Sum across all 4 businesses
      const grandGross = gym.gross + cafe.gross + yogurt.gross + yCafe.gross;
      const grandPettyToday = gym.pettyToday + cafe.pettyToday + yogurt.pettyToday + yCafe.pettyToday;
      const grandPettyTomorrow = gym.pettyTomorrow + cafe.pettyTomorrow + yogurt.pettyTomorrow + yCafe.pettyTomorrow;
      const grandExpenses = gym.expenses + cafe.expenses + yogurt.expenses + yCafe.expenses;
      const grandNet = grandGross + grandPettyToday - grandPettyTomorrow - grandExpenses;

      return {
        id: idx,
        Date: dt,

        // Gym columns
        gymGross: gym.gross,
        gymPettyToday: gym.pettyToday,
        gymPettyTomorrow: gym.pettyTomorrow,
        gymExpenses: gym.expenses,
        gymNet: gym.net,

        // Cafe columns
        cafeGross: cafe.gross,
        cafePettyToday: cafe.pettyToday,
        cafePettyTomorrow: cafe.pettyTomorrow,
        cafeExpenses: cafe.expenses,
        cafeNet: cafe.net,

        // Yogurt columns
        yogurtGross: yogurt.gross,
        yogurtPettyToday: yogurt.pettyToday,
        yogurtPettyTomorrow: yogurt.pettyTomorrow,
        yogurtExpenses: yogurt.expenses,
        yogurtNet: yogurt.net,

        // Yogurt Cafe columns
        yCafeGross: yCafe.gross,
        yCafePettyToday: yCafe.pettyToday,
        yCafePettyTomorrow: yCafe.pettyTomorrow,
        yCafeExpenses: yCafe.expenses,
        yCafeNet: yCafe.net,

        // Grand totals
        grandGross,
        grandPettyToday,
        grandPettyTomorrow,
        grandExpenses,
        grandNet,
      };
    });

  // 6) Filter rows by bizFilter if needed
  let filteredRows = resultRows;
  if (bizFilter !== 'all') {
    let prefix = '';
    if (bizFilter === 'Gym') prefix = 'gym';
    if (bizFilter === 'Cafe') prefix = 'cafe';
    if (bizFilter === 'Yogurt') prefix = 'yogurt';
    if (bizFilter === 'Yogurt Cafe') prefix = 'yCafe';

    filteredRows = resultRows.filter((r) => {
      const g = r[`${prefix}Gross`] || 0;
      const n = r[`${prefix}Net`] || 0;
      return Math.abs(g) > 0.001 || Math.abs(n) > 0.001;
    });
  }

  setConsolidatedRows(filteredRows);
}
  
  const buildNetProfitChart = (rows) => {
    // Suppose net = grandTakeHome (for demonstration)
    const labels = rows.map(r => r.Date);
    const data = rows.map(r => r.grandTakeHome);
    setNetProfitChart({
      labels,
      datasets: [
        {
          label: 'Daily Net (TakeHome)',
          data,
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66,165,245,0.3)',
          fill: true,
          tension: 0.2,
        },
      ],
    });
  };

  function filterByDateRange(rows, dateFrom, dateTo) {
    if (!rows || rows.length === 0) return [];
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    return rows.filter((row) => {
      const rowDate = new Date(row.Date);
      if (from && rowDate < from) return false;
      if (to && rowDate > to) return false;
      return true;
    });
  }

  const closeConsolidatedPettyDialog = () => {
    setPettyDialogOpen(false);
  };
  const handlePettyFormChange = (e) => {
    const { name, value } = e.target;
    setPettyForm((prev) => {
      let next = { ...prev, [name]: value };
      if (name === 'pettyCash') {
        const netProfit = Number(selectedConsolidatedRow?.NetProfit || 0);
        const pettyNum = parseFloat(value) || 0;
        next.depositedAmount = netProfit - pettyNum >= 0 ? netProfit - pettyNum : 0;
      }
      return next;
    });
  };
  const handleSubmitConsolidatedPetty = async () => {
    if (!selectedConsolidatedRow) return;
    const petty = parseFloat(pettyForm.pettyCash) || 0;
    const deposit = parseFloat(pettyForm.depositedAmount) || 0;
    const dateStr = selectedConsolidatedRow.Date;
    let branchPayload = pettyForm.branchSelection;
    if (branchPayload === 'all') {
      branchPayload = null;
    }
    try {
      await axios.post('/finance/cashflow', {
        BranchID: branchPayload,
        Date: dateStr,
        BusinessType: 'Overall',
        TotalSales: 0,
        PettyCash: petty,
        DepositedAmount: deposit,
        Remarks: pettyForm.remarks,
      });
      showSuccessMessage(`Petty Cash for ${formatDate(dateStr)} Saved!`);
      setPettyDialogOpen(false);
      const cfRes = await axios.get('/finance/cashflow');
      const flows = cfRes.data.flows || [];
      setAllFlows(flows);
      const newFiltered = applyDateFilter(flows, dateFrom, dateTo);
      setFilteredFlows(newFiltered);
      buildRevenueTrends(newFiltered);
      buildPaymentPie(newFiltered);
      buildBusinessCharts(newFiltered);
    } catch (err) {
      console.error(err);
      alert('Failed to set petty cash');
    }
  };

  function getDynamicConsolidatedColumns() {
    const baseDateCol = [
      {
        field: 'Date',
        headerName: 'Date',
        width: 120,
        renderCell: (params) => (params.value ? formatDate(params.value) : '—'),
      },
    ];
  
    const columns = [];
  
    function maybeAddBizColumns(bizKey, labelPrefix) {
      if (bizFilter !== 'all' && bizFilter !== labelPrefix) return;
  
      // Gross column
      columns.push({
        field: `${bizKey}Gross`,
        headerName: `${labelPrefix} Gross`,
        width: 110,
        renderCell: (params) => formatCurrency(params.value),
      });
  
      // Petty Today column, using new toggle flag
      if (showPettyToday) {
        columns.push({
          field: `${bizKey}PettyToday`,
          headerName: `${labelPrefix} Petty (Today)`,
          width: 120,
          renderCell: (params) => formatCurrency(params.value),
        });
      }
  
      // Petty Tomorrow column, using new toggle flag
      if (showPettyTomorrow) {
        columns.push({
          field: `${bizKey}PettyTomorrow`,
          headerName: `${labelPrefix} Petty (Tomorrow)`,
          width: 140,
          renderCell: (params) => formatCurrency(params.value),
        });
      }
  
      if (showExpenses) {
        columns.push({
          field: `${bizKey}Expenses`,
          headerName: `${labelPrefix} Exp`,
          width: 90,
          renderCell: (params) => formatCurrency(params.value),
        });
      }
  
      // Net column always
      columns.push({
        field: `${bizKey}Net`,
        headerName: `${labelPrefix} Net`,
        width: 100,
        renderCell: (params) => formatCurrency(params.value),
      });
    }
  
    // Add columns for each business
    maybeAddBizColumns('gym', 'Gym');
    maybeAddBizColumns('cafe', 'Cafe');
    maybeAddBizColumns('yogurt', 'Yogurt');
    maybeAddBizColumns('yCafe', 'Yogurt Cafe');
  
    // Grand totals if bizFilter is 'all'
    if (bizFilter === 'all') {
      columns.push({
        field: 'grandGross',
        headerName: 'Grand Gross',
        width: 120,
        renderCell: (params) => formatCurrency(params.value),
      });
      if (showPettyToday) {
        columns.push({
          field: 'grandPettyToday',
          headerName: 'Grand Petty (Today)',
          width: 140,
          renderCell: (params) => formatCurrency(params.value),
        });
      }
      if (showPettyTomorrow) {
        columns.push({
          field: 'grandPettyTomorrow',
          headerName: 'Grand Petty (Tomorrow)',
          width: 160,
          renderCell: (params) => formatCurrency(params.value),
        });
      }
      if (showExpenses) {
        columns.push({
          field: 'grandExpenses',
          headerName: 'Grand Exp',
          width: 110,
          renderCell: (params) => formatCurrency(params.value),
        });
      }
      columns.push({
        field: 'grandNet',
        headerName: 'Grand Net',
        width: 110,
        renderCell: (params) => formatCurrency(params.value),
      });
    }
  
    return [...baseDateCol, ...columns];
  }
  
  
  function filterByDateRange(rows, dateFrom, dateTo) {
      if (!rows || rows.length === 0) return [];
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;

      return rows.filter((row) => {
        const rowDate = new Date(row.Date);
        if (from && rowDate < from) return false;
        if (to && rowDate > to) return false;
        return true;
      });
    }



  // 2) A function to sum up displayedConsolidated.reduce((acc, r) => ...
  function handleSumGrandNet() {
    const sum = displayedConsolidated.reduce((acc, row) => acc + (row.grandNet || 0), 0);
    setSumGrandNet(sum);
  }

  function handleSumGrandPettyExpenses() {
    const pettyTotal = displayedConsolidated.reduce((acc, row) => acc + (row.grandPetty || 0), 0);
    const expenseTotal = displayedConsolidated.reduce((acc, row) => acc + (row.grandExpenses || 0), 0);
  
    setSumGrandPetty(pettyTotal);
    setSumGrandExpenses(expenseTotal);
  }
  
  // We'll create the displayed rows for netProfit chart & table
  const displayedConsolidated = filterByDateRange(consolidatedRows, dateFrom, dateTo);
  useEffect(() => {
    buildNetProfitChart(displayedConsolidated);
  }, [displayedConsolidated]);


// [UPDATED] handleOverviewFilter to also filter members by StartedBranchID
function handleOverviewFilter() {
  // 1) Filter flows by branch + biz
  const flowsFiltered = allFlows.filter((flow) => {
    if (
      overviewBranchFilter !== 'all' &&
      String(flow.BranchID) !== String(overviewBranchFilter)
    ) {
      return false;
    }
    if (
      overviewBizFilter !== 'all' &&
      flow.BusinessType !== overviewBizFilter
    ) {
      return false;
    }
    return true;
  });

  // 2) Filter expenses by branch + biz
  const expensesFiltered = allExpenses.filter((exp) => {
    if (
      overviewBranchFilter !== 'all' &&
      String(exp.BranchID) !== String(overviewBranchFilter)
    ) {
      return false;
    }
    if (
      overviewBizFilter !== 'all' &&
      exp.BusinessType !== overviewBizFilter
    ) {
      return false;
    }
    return true;
  });

  // 3) [NEW] Filter members by branch (StartedBranchID)
  //    If you do NOT want business filtering for members, skip that part.
  const membersFiltered = staff.filter((member) => {
    // Filter by branch:
    if (
      overviewBranchFilter !== 'all' &&
      String(member.StartedBranchID) !== String(overviewBranchFilter)
    ) {
      return false;
    }

    // Optionally filter by business if you have a way to associate 
    // members with a business type (e.g. via the membership plan).
    // For example, if `member.plan` has a `PlanType` field:
    /*
    if (
      overviewBizFilter !== 'all' &&
      member.plan?.PlanType !== overviewBizFilter
    ) {
      return false;
    }
    */

    return true;
  });

  // 4) Rebuild charts with the filtered data
  buildRevenueTrends(flowsFiltered);
  buildPaymentPie(flowsFiltered);
  buildBusinessCharts(flowsFiltered);
  buildExpenseChart(expensesFiltered);

  // 5) Recalc the key metrics, including new totalClients from membersFiltered
  const partialMetrics = computeLocalOverviewMetrics(
    flowsFiltered,
    expensesFiltered,
    membersFiltered
  );
  setKeyMetrics(partialMetrics);
}

// [UPDATED] computeLocalOverviewMetrics to reflect membersFiltered
function computeLocalOverviewMetrics(flowsFiltered, expensesFiltered, membersFiltered) {
  let totalRevenue = 0;
  let totalExpenses = 0;

  flowsFiltered.forEach((f) => {
    totalRevenue += Number(f.TotalSales || 0);
  });
  expensesFiltered.forEach((e) => {
    totalExpenses += Number(e.Amount || 0);
  });

  // The "Members" card: totalClients => count of filtered members
  const totalClients = membersFiltered.length;
  const totalPaymentsCount = flowsFiltered.length;

  return {
    totalRevenue,
    totalExpenses,
    totalEmailsSent: keyMetrics.totalEmailsSent, // or filter if you have a direct link to emails
    trafficReceived: 0,
    totalClients, // your "Members" card will display this
    totalPaymentsCount,
  };
}

// Add at the top of the file, near other useRef declarations
const overviewFilterRef = useRef({
  branchFilter: null,
  bizFilter: null,
  dateFrom: null,
  dateTo: null,
  flowsLength: 0,
  expensesLength: 0,
  staffLength: 0
});

useEffect(() => {
  // Only run if you have the data loaded
  if (!allFlows.length && !allExpenses.length && !staff.length) {
    return;
  }

  // Check if any of the dependencies have actually changed
  const currentDeps = {
    branchFilter: overviewBranchFilter,
    bizFilter: overviewBizFilter,
    dateFrom,
    dateTo,
    flowsLength: allFlows.length,
    expensesLength: allExpenses.length,
    staffLength: staff.length
  };
  
  const hasChanged = Object.keys(currentDeps).some(
    key => currentDeps[key] !== overviewFilterRef.current[key]
  );
  
  if (hasChanged) {
    overviewFilterRef.current = { ...currentDeps };
    // Automatically invoke the existing handleOverviewFilter function
    handleOverviewFilter();
  }
}, [
  overviewBranchFilter,
  overviewBizFilter,
  dateFrom,
  dateTo,
  allFlows,
  allExpenses,
  staff
]);

  // Member Activity Metrics Component
  const MemberActivityMetrics = () => {
    return (
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Member Activity Summary
          </Typography>
          
          {memberMetricsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: darkMode ? 'rgba(41, 98, 255, 0.1)' : '#e3f2fd',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <PersonIcon sx={{ mr: 1, color: '#2979ff' }} />
                    <Typography variant="h6">Member Logins</Typography>
                  </Box>
                  <Typography variant="h4">{memberMetrics.loginsToday}</Typography>
                  <Typography variant="body2" color="textSecondary">logged in today</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e9',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <MonetizationOnIcon sx={{ mr: 1, color: '#43a047' }} />
                    <Typography variant="h6">Subscription Renewals</Typography>
                  </Box>
                  <Typography variant="h4">{memberMetrics.renewalsToday}</Typography>
                  <Typography variant="body2" color="textSecondary">renewals today</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: darkMode ? 'rgba(255, 87, 34, 0.1)' : '#ffccbc',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <DirectionsWalk sx={{ mr: 1, color: '#d84315' }} />
                    <Typography variant="h6">Walk-ins</Typography>
                  </Box>
                  <Typography variant="h4">{memberMetrics.walkInsToday || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">walk-ins today</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: darkMode ? 'rgba(156, 39, 176, 0.1)' : '#f3e5f5',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <PersonAdd sx={{ mr: 1, color: '#8e24aa' }} />
                    <Typography variant="h6">New Sign-ups</Typography>
                  </Box>
                  <Typography variant="h4">{memberMetrics.newSignUpsToday || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">new members today</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    backgroundColor: darkMode ? 'rgba(255, 193, 7, 0.1)' : '#fff8e1'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <AccountBalanceWallet sx={{ mr: 1, color: '#ff9800' }} />
                    <Typography variant="h6">Renewal Plan Breakdown</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <PesosIcon fontSize={16} />1,599 Plan
                      </Typography>
                      <Typography variant="h5">{memberMetrics.renewalBreakdown.plan1599}</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <PesosIcon fontSize={16} />1,799 Plan
                      </Typography>
                      <Typography variant="h5">{memberMetrics.renewalBreakdown.plan1799}</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                        <PesosIcon fontSize={16} />1,999 Plan
                      </Typography>
                      <Typography variant="h5">{memberMetrics.renewalBreakdown.plan1999}</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button 
              size="small" 
              startIcon={<TrendingUp />}
              onClick={() => fetchMemberMetrics(overviewBranchFilter)}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>

      
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          borderRadius: 2,
          mb: 2,
          p: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <IconButton sx={{ color: '#fff', mr: 1 }}>
          <Dashboard />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
           Owner Dashboard
          </Typography>
          <Typography variant="body2">Key performance overview and quick actions</Typography>
        </Box>
      </Box>

      {/* Main Tabs */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-center' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" icon={<TrendingUp />} iconPosition="start" />
          <Tab label="Daily Cash Flow" icon={<PesosIcon fontSize={18} />} iconPosition="start" />
          <Tab label="Expenses" icon={<ReceiptLong />} iconPosition="start" />
          <Tab label="Consolidated" icon={<TableView />} iconPosition="start" />
        </Tabs>
      </Box>

      {error && (
        <Typography variant="body1" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {loading ? (
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* =================== OVERVIEW TAB =================== */}
          {activeTab === 0 && (
            <Box sx={{ mt: 1 }}>
            {/* [NEW STUFF] Filter by Branch + Biz for Overview */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Branch</InputLabel>
                <Select
                  label="Branch"
                  value={overviewBranchFilter}
                  onChange={(e) => setOverviewBranchFilter(e.target.value)}
                >
                  <MenuItem value="all">All Branches</MenuItem>
                  {branchOptions
                    .filter((b) => b.value !== 'all') // or show them all if you want
                    .map((b) => (
                      <MenuItem key={b.value} value={b.value}>
                        {b.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Business</InputLabel>
                <Select
                  label="Business"
                  value={overviewBizFilter}
                  onChange={(e) => setOverviewBizFilter(e.target.value)}
                >
                  <MenuItem value="all">All Business Types</MenuItem>
                  <MenuItem value="Gym">Gym</MenuItem>
                  <MenuItem value="Cafe">Cafe</MenuItem>
                  <MenuItem value="Yogurt">Yogurt</MenuItem>
                  <MenuItem value="Yogurt Cafe">Yogurt Cafe</MenuItem>
                  {/* add more if you have them */}
                </Select>
              </FormControl>
            </Box>
              <Grid container spacing={2}>
                {/* Key Metrics Cards */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      backgroundColor: '#EF5350', // for example, a red accent
                      borderRadius: 2,
                      boxShadow: 3,
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 30, color: 'white', mr: 1.5, fontWeight: 'bold' }}>
                      ₱
                    </Typography>
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="body2" sx={{ color: 'white', mb: 0.5 }}>
                        Net Profit
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {formatCurrency(keyMetrics.totalRevenue - keyMetrics.totalExpenses)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      backgroundColor: '#66BB6A',
                      borderRadius: 2,
                      boxShadow: 3,
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 30, color: 'white', mr: 1.5, fontWeight: 'bold' }}>₱</Typography>
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="body2" sx={{ color: 'white', mb: 0.5 }}>
                        Total Gross
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {formatCurrency(keyMetrics.totalRevenue)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      backgroundColor: '#FF7043', // or any accent color
                      borderRadius: 2,
                      boxShadow: 3,
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                    }}
                  >
                    <AttachMoney sx={{ fontSize: 30, color: 'white', mr: 1.5 }} />
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="body2" sx={{ color: 'white', mb: 0.5 }}>
                        Total Cash Flows
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {keyMetrics.totalPaymentsCount ?? 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      backgroundColor: '#9C27B0',
                      borderRadius: 2,
                      boxShadow: 3,
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 30, color: 'white', mr: 1.5, fontWeight: 'bold' }}>₱</Typography>
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="body2" sx={{ color: 'white', mb: 0.5 }}>
                        Total Expenses
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {formatCurrency(keyMetrics.totalExpenses)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

              
              {/* 3) [NEW LOCATION] Today's Member Activity  */}
              <Grid item xs={12} md={12} lg={12}>
                <Paper sx={{ p: 2, boxShadow: 3, mt: 3 }}>
                  <MemberActivityMetrics />
                </Paper>
              </Grid>

                {/* Revenue Trends Chart */}
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 2, height: 400, boxShadow: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Revenue Trends
                    </Typography>
                    <Box sx={{ height: '80%' }}>
                      {revenueChartData ? (
                        <Line
                          data={revenueChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                          }}
                        />
                      ) : (
                        <Typography>Loading chart...</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* Payment Method Pie */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: 400, boxShadow: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Payment Method Breakdown
                    </Typography>
                    <Box sx={{ height: '80%' }}>
                      {paymentMethodPie ? (
                        <Pie
                          data={paymentMethodPie}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom' } },
                          }}
                        />
                      ) : (
                        <Typography>Loading pie chart...</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* Daily Expenses Trend */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, height: 400, boxShadow: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Daily Expenses Trend
                    </Typography>
                    <Box sx={{ height: '80%' }}>
                      {expenseChartData ? (
                        <Line
                          data={expenseChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom' } },
                          }}
                        />
                      ) : (
                        <Typography>Loading expenses chart...</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* Payment Breakdown by Biz */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    Payment Breakdown by Business
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: 280, boxShadow: 3, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Gym
                    </Typography>
                    <Box sx={{ flexGrow: 1, height: '100%', minHeight: 0 }}>
                      {gymChartData ? (
                        <Line
                          data={gymChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom' } },
                          }}
                        />
                      ) : (
                        <Typography>Loading Gym chart...</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: 280, boxShadow: 3, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Café
                    </Typography>
                    <Box sx={{ flexGrow: 1, height: '100%', minHeight: 0 }}>
                      {cafeChartData ? (
                        <Line
                          data={cafeChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom' } },
                          }}
                        />
                      ) : (
                        <Typography>Loading Café chart...</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: 280, boxShadow: 3, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Yogurt
                    </Typography>
                    <Box sx={{ flexGrow: 1, height: '100%', minHeight: 0 }}>
                      {yogurtChartData ? (
                        <Line
                          data={yogurtChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom' } },
                          }}
                        />
                      ) : (
                        <Typography>Loading Yogurt chart...</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={12}>
                  <Paper sx={{ p: 2, height: 280, boxShadow: 3, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Yogurt Cafe
                    </Typography>
                    <Box sx={{ flexGrow: 1, height: '100%', minHeight: 0 }}>
                      {yogurtCafeChartData ? (
                        <Line
                          data={yogurtCafeChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                          }}
                        />
                      ) : (
                        <Typography>Loading Yogurt Cafe chart...</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>


                <Grid item xs={12} md={12}>
                  <Paper
                    sx={{
                      p: 3,
                      boxShadow: 4,
                      borderRadius: 2,
                      overflow: 'hidden',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      Today's Member Activity Details
                    </Typography>
                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                      <Tabs 
                        value={activityTab} 
                        onChange={(e, newValue) => setActivityTab(newValue)} 
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                      >
                        <Tab label="Logged In Members" icon={<PersonIcon />} iconPosition="start" />
                        <Tab label="Membership Renewals" icon={<MonetizationOnIcon />} iconPosition="start" />
                        <Tab label="Walk-ins" icon={<DirectionsWalk />} iconPosition="start" />
                        <Tab label="New Sign-ups" icon={<PersonAdd />} iconPosition="start" />
                      </Tabs>

                      {/* Logged In Members Tab */}
                      {activityTab === 0 && (
                        <>
                          {memberMetricsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress />
                            </Box>
                          ) : memberMetrics.loggedInMembers && memberMetrics.loggedInMembers.length > 0 ? (
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Phone</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell>Visit Time</TableCell>
                                    <TableCell>Branch</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {memberMetrics.loggedInMembers.map((member) => (
                                    <TableRow key={member.MemberID}>
                                      <TableCell>{member.FullName}</TableCell>
                                      <TableCell>{member.Email}</TableCell>
                                      <TableCell>{member.Phone}</TableCell>
                                      <TableCell>{member.PlanName}</TableCell>
                                      <TableCell>{formatDateTime(member.VisitDate)}</TableCell>
                                      <TableCell>{member.BranchName}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Typography sx={{ p: 2, textAlign: 'center' }}>No members have logged in today.</Typography>
                          )}
                        </>
                      )}

                      {/* Membership Renewals Tab */}
                      {activityTab === 1 && (
                        <>
                          {memberMetricsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress />
                            </Box>
                          ) : memberMetrics.allRenewals && memberMetrics.allRenewals.length > 0 ? (
                            <>
                              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Paper 
                                  elevation={1} 
                                  sx={{ p: 1, bgcolor: '#e3f2fd', flex: '1 0 auto', minWidth: '120px', textAlign: 'center' }}
                                >
                                  <Typography variant="body2">₱1,599 Plan</Typography>
                                  <Typography variant="h6">{memberMetrics.renewalBreakdown.plan1599}</Typography>
                                </Paper>
                                
                                <Paper 
                                  elevation={1} 
                                  sx={{ p: 1, bgcolor: '#e8f5e9', flex: '1 0 auto', minWidth: '120px', textAlign: 'center' }}
                                >
                                  <Typography variant="body2">₱1,799 Plan</Typography>
                                  <Typography variant="h6">{memberMetrics.renewalBreakdown.plan1799}</Typography>
                                </Paper>
                                
                                <Paper 
                                  elevation={1} 
                                  sx={{ p: 1, bgcolor: '#fff8e1', flex: '1 0 auto', minWidth: '120px', textAlign: 'center' }}
                                >
                                  <Typography variant="body2">₱1,999 Plan</Typography>
                                  <Typography variant="h6">{memberMetrics.renewalBreakdown.plan1999}</Typography>
                                </Paper>
                                
                                <Paper 
                                  elevation={1} 
                                  sx={{ p: 1, bgcolor: '#f3e5f5', flex: '1 0 auto', minWidth: '120px', textAlign: 'center' }}
                                >
                                  <Typography variant="body2">Other Plans</Typography>
                                  <Typography variant="h6">{memberMetrics.renewalBreakdown.otherPlans}</Typography>
                                </Paper>
                              </Box>
                              
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Name</TableCell>
                                      <TableCell>Email</TableCell>
                                      <TableCell>Phone</TableCell>
                                      <TableCell>Plan</TableCell>
                                      <TableCell>Price</TableCell>
                                      <TableCell>Renewal Date</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {memberMetrics.allRenewals.map((renewal) => (
                                      <TableRow key={renewal.RenewalID}>
                                        <TableCell>{renewal.FullName}</TableCell>
                                        <TableCell>{renewal.Email}</TableCell>
                                        <TableCell>{renewal.Phone}</TableCell>
                                        <TableCell>{renewal.PlanName}</TableCell>
                                        <TableCell>₱{renewal.Price}</TableCell>
                                        <TableCell>{formatDate(renewal.RenewalDate)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </>
                          ) : (
                            <Typography sx={{ p: 2, textAlign: 'center' }}>No membership renewals today.</Typography>
                          )}
                        </>
                      )}

                      {/* Walk-ins Tab */}
                      {activityTab === 2 && (
                        <>
                          {memberMetricsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress />
                            </Box>
                          ) : memberMetrics.walkInDetails && memberMetrics.walkInDetails.length > 0 ? (
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Visit Time</TableCell>
                                    <TableCell>Branch</TableCell>
                                    <TableCell>Amount Paid</TableCell>
                                    <TableCell>Notes</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {memberMetrics.walkInDetails.map((walkin) => (
                                    <TableRow key={walkin.WalkInID}>
                                      <TableCell>{walkin.FullName}</TableCell>
                                      <TableCell>{formatDateTime(walkin.VisitDate)}</TableCell>
                                      <TableCell>{walkin.BranchName}</TableCell>
                                      <TableCell>
                                        ₱{walkin.Amount && typeof walkin.Amount === 'number'
                                            ? walkin.Amount.toFixed(2)
                                            : typeof walkin.Amount === 'string' && !isNaN(parseFloat(walkin.Amount))
                                            ? parseFloat(walkin.Amount).toFixed(2)
                                            : '0.00'}
                                      </TableCell>
                                      <TableCell>{walkin.Notes}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Typography sx={{ p: 2, textAlign: 'center' }}>No walk-ins today.</Typography>
                          )}
                        </>
                      )}

                      {/* New Sign-ups Tab */}
                      {activityTab === 3 && (
                        <>
                          {memberMetricsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress />
                            </Box>
                          ) : memberMetrics.newSignUpDetails && memberMetrics.newSignUpDetails.length > 0 ? (
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Phone</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell>Start Date</TableCell>
                                    <TableCell>End Date</TableCell>
                                    <TableCell>Branch</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {memberMetrics.newSignUpDetails.map((member) => (
                                    <TableRow key={member.MemberID}>
                                      <TableCell>{member.FullName}</TableCell>
                                      <TableCell>{member.Email}</TableCell>
                                      <TableCell>{member.Phone}</TableCell>
                                      <TableCell>{member.PlanName} (₱{member.Price})</TableCell>
                                      <TableCell>{formatDate(member.MembershipStartDate)}</TableCell>
                                      <TableCell>{formatDate(member.MembershipEndDate)}</TableCell>
                                      <TableCell>{member.BranchName}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Typography sx={{ p: 2, textAlign: 'center' }}>No new sign-ups today.</Typography>
                          )}
                        </>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button 
                        size="small" 
                        startIcon={<TrendingUp />}
                        onClick={() => fetchMemberMetrics(overviewBranchFilter)}
                      >
                        Refresh
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

            {/* =================== DAILY CASH FLOW TAB =================== */}
            {activeTab === 1 && (
              <Box sx={{ mt: 1 }}>
                <Paper sx={{ p: 3, mb: 2, boxShadow: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    Filter Cash Flow & Expenses By Date
                  </Typography>
                  <Grid container spacing={2}>
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
                    <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button variant="contained" onClick={handleFilterCashFlow}>
                        Filter
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={(e) => setExportAnchorEl(e.currentTarget)}
                      >
                        Export
                      </Button>
                      <Menu
                        anchorEl={exportAnchorEl}
                        open={Boolean(exportAnchorEl)}
                        onClose={() => setExportAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                      >
                        <MenuItem>
                          <CSVLink
                            data={filteredFlows.map((f, i) => flowRows[i])}
                            headers={flowColumns.map((col) => ({
                              label: col.headerName,
                              key: col.field,
                            }))}
                            filename="CashFlowData.csv"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            Export CSV
                          </CSVLink>
                        </MenuItem>
                        <MenuItem onClick={handleExportPDF}>Export PDF</MenuItem>
                      </Menu>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={3}
                      sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenCashFlowDialog}
                        startIcon={<AddIcon />}
                      >
                        Add Good One Cash Flow Entry
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                <Paper sx={{ p: 3, boxShadow: 4, borderRadius: 2 }}>
                  <Tabs
                    value={selectedTab}
                    onChange={(e, newValue) => setSelectedTab(newValue)}
                    variant="fullWidth"
                  >
                    <Tab icon={<FitnessCenter />} iconPosition="start" label="Gym" />
                    <Tab icon={<LocalCafe />} iconPosition="start" label="Café" />
                    <Tab icon={<Icecream />} iconPosition="start" label="Yogurt" />
                    <Tab icon={<LocalCafe />} iconPosition="start" label="Yogurt Cafe" />
                  </Tabs>

                  {selectedTab === 0 && (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                        Gym Cash Flow
                      </Typography>
                      <Box sx={{ height: 400 }}>
                        <DataGrid
                          rows={filteredFlows.map((f, i) => flowRows[i]).filter((r) => r.BusinessType === 'Gym')}
                          columns={flowColumns /* includes PettyCashTomorrow column now */}
                          pageSize={5}
                          rowsPerPageOptions={[5, 10]}
                          disableSelectionOnClick
                          autoHeight
                          density="compact"
                          disableColumnMenu
                        />
                      </Box>
                    </>
                  )}
                  {selectedTab === 1 && (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                        Café Cash Flow
                      </Typography>
                      <Box sx={{ height: 400 }}>
                        <DataGrid
                          rows={filteredFlows.map((f, i) => flowRows[i]).filter((r) => r.BusinessType === 'Cafe')}
                          columns={flowColumns}
                          pageSize={5}
                          rowsPerPageOptions={[5, 10]}
                          disableSelectionOnClick
                          autoHeight
                          density="compact"
                          disableColumnMenu
                        />
                      </Box>
                    </>
                  )}
                  {selectedTab === 2 && (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                        Yogurt Cash Flow
                      </Typography>
                      <Box sx={{ height: 400 }}>
                        <DataGrid
                          rows={filteredFlows.map((f, i) => flowRows[i]).filter((r) => r.BusinessType === 'Yogurt')}
                          columns={flowColumns}
                          pageSize={5}
                          rowsPerPageOptions={[5, 10]}
                          disableSelectionOnClick
                          autoHeight
                          density="compact"
                          disableColumnMenu
                        />
                      </Box>
                    </>
                  )}
                  {selectedTab === 3 && (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                        Yogurt Cafe Cash Flow
                      </Typography>
                      <Box sx={{ height: 400 }}>
                        <DataGrid
                          rows={filteredFlows
                            .map((f, i) => flowRows[i])
                            .filter((r) => r.BusinessType === 'Yogurt Cafe')
                          }
                          columns={flowColumns}
                          pageSize={5}
                          rowsPerPageOptions={[5, 10]}
                          disableSelectionOnClick
                          autoHeight
                          density="compact"
                          disableColumnMenu
                        />
                      </Box>
                    </>
                  )}
                </Paper>
              </Box>
            )}

          {/* =================== EXPENSES TAB =================== */}
          {activeTab === 2 && (
            <Box sx={{ mt: 1 }}>
              <Paper sx={{ p: 3, mb: 2, boxShadow: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                  Filter Expenses By Date
                </Typography>
                <Grid container spacing={2}>
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
                  <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button variant="contained" onClick={handleFilterExpenses}>
                      Filter
                    </Button>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={3}
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                    }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => setExpenseFormOpen(true)}
                    >
                      Add New Expense
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
              <Paper sx={{ p: 3, boxShadow: 4, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Expenses List
                </Typography>
                <Box sx={{ height: 400, mt: 2 }}>
                  <DataGrid
                    rows={filteredExpenses.map((e, i) => expenseRows[i])}
                    columns={expenseColumns}
                    pageSize={5}
                    rowsPerPageOptions={[5, 10]}
                    disableSelectionOnClick
                    autoHeight
                    density="compact"
                    disableColumnMenu
                  />
                </Box>
              </Paper>
            </Box>
          )}

          {/* =================== CONSOLIDATED TAB =================== */}
          {activeTab === 3 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                Consolidated Daily View
              </Typography>

              {/* [NEW] Filters for Payment, Biz Type, toggles for petty/expense */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <TextField
                  label="From Date"
                  type="date"
                  size="small"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="To Date"
                  type="date"
                  size="small"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
               <FormControl size="small">
                  <InputLabel>Branch</InputLabel>
                  <Select
                    label="Branch"
                    value={consolidatedBranchFilter}
                    onChange={(e) => setConsolidatedBranchFilter(e.target.value)}
                    sx={{ width: 120 }}
                  >
                    <MenuItem value="all">All Branches</MenuItem>
                    {branchOptions
                      .filter((b) => b.value !== 'all')
                      .map((b) => (
                        <MenuItem key={b.value} value={b.value}>
                          {b.label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>Payment</InputLabel>
                  <Select
                    label="Payment"
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    sx={{ width: 120 }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="GCash">GCash</MenuItem>
                    <MenuItem value="BPI">BPI</MenuItem>
                    <MenuItem value="BDO">BDO</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>Business</InputLabel>
                  <Select
                    label="Business"
                    value={bizFilter}
                    onChange={(e) => setBizFilter(e.target.value)}
                    sx={{ width: 140 }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="Gym">Gym</MenuItem>
                    <MenuItem value="Cafe">Cafe</MenuItem>
                    <MenuItem value="Yogurt">Yogurt</MenuItem>
                    <MenuItem value="Yogurt Cafe">Yogurt Cafe</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                    control={
                      <Checkbox
                        checked={showPettyToday}
                        onChange={(e) => setShowPettyToday(e.target.checked)}
                      />
                    }
                    label="Include Petty Today"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showPettyTomorrow}
                        onChange={(e) => setShowPettyTomorrow(e.target.checked)}
                      />
                    }
                    label="Include Petty Tomorrow"
                  />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showExpenses}
                      onChange={(e) => setShowExpenses(e.target.checked)}
                    />
                  }
                  label="Include Expenses"
                />
              </Box>
             <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Daily Consolidated Table
              </Typography>
              {/* Make sure the Box fills the card exactly */}
              <Box sx={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={displayedConsolidated}
                  columns={getDynamicConsolidatedColumns()}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10]}
                  disableSelectionOnClick
                  disableColumnMenu
                  density="compact"
                  // autoHeight removed so the grid adheres to the parent's height
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button variant="contained" onClick={handleSumGrandNet}>
                  Sum Grand Net
                </Button>
                {sumGrandNet !== 0 && (
                  <Typography variant="body1">
                    Grand Net: <strong>{formatCurrency(sumGrandNet)}</strong>
                  </Typography>
                )}
                <Button variant="contained" onClick={handleSumGrandPettyExpenses}>
                  Sum Petty & Expenses
                </Button>
                {(sumGrandPetty !== 0 || sumGrandExpenses !== 0) && (
                  <Typography variant="body1">
                    Petty: <strong>{formatCurrency(sumGrandPetty)}</strong> | Expenses: <strong>{formatCurrency(sumGrandExpenses)}</strong>
                  </Typography>
                )}
              </Box>
            </Paper>

            </Box>
          )}
        </>
      )}

      {/* Overall Flow Dialog */}
      <Dialog
        open={openOverallDialog}
        onClose={handleCloseOverallDialog}
        fullWidth
        maxWidth="sm"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: 6,
            p: 4,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <AccountBalance color="primary" /> Generate Overall Daily Cash Flow
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Typography component="span" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              ₱
            </Typography>
            Computed Overall Total (Gym + Cafe + Yogurt):
            <span style={{ color: '#66BB6A', fontWeight: 'bold' }}>
              ₱{computedOverallTotal.toLocaleString()}
            </span>
          </Typography>
          <TextField
            fullWidth
            label="Petty Cash Deduction"
            name="pettyDeduction"
            type="number"
            value={overallInput.pettyDeduction}
            onChange={handleOverallInputChange}
            margin="dense"
            variant="outlined"
            InputProps={{
              startAdornment: <AccountBalance sx={{ color: 'primary.main', mr: 1 }} />,
            }}
          />
          <FormControlLabel
            control={
              <Checkbox checked={overallInput.deposited} onChange={handleOverallInputChange} name="deposited" />
            }
            label="Deposited to owner"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 3 }}>
          <Button onClick={handleCloseOverallDialog} sx={{ color: 'red' }} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmitOverallFlow} startIcon={<Save />}>
            Submit Overall Flow
          </Button>
        </DialogActions>
      </Dialog>

      {/* Petty Cash Dialog (Consolidated) */}
      <Dialog
        open={pettyDialogOpen}
        onClose={closeConsolidatedPettyDialog}
        fullWidth
        maxWidth="sm"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: 6,
            p: 3,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWallet sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Set Petty Cash for{' '}
                {selectedConsolidatedRow?.Date ? formatDate(selectedConsolidatedRow.Date) : ''}
              </Typography>
            </Box>
            <IconButton
              onClick={closeConsolidatedPettyDialog}
              sx={{
                '&:hover': { color: 'red' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {selectedConsolidatedRow && (
            <>
              <Typography
                variant="h6"
                sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Typography component="span" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  ₱
                </Typography>
                Net Profit:{' '}
                <span style={{ color: '#66BB6A' }}>
                  ₱{Number(selectedConsolidatedRow.NetProfit || 0).toLocaleString()}
                </span>
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Savings color="action" />
                Take Home before petty:{' '}
                <strong>₱{Number(selectedConsolidatedRow.TakeHome || 0).toLocaleString()}</strong>
              </Typography>
            </>
          )}

          {/* Branch Selection */}
          <FormControl fullWidth size="medium" sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Branch</InputLabel>
            <Select
              label="Branch"
              name="branchSelection"
              value={pettyForm.branchSelection}
              onChange={handlePettyFormChange}
              startAdornment={
                <InputAdornment position="start">
                  <StoreIcon />
                </InputAdornment>
              }
            >
              <MenuItem value="all">All / Overall</MenuItem>
              {branchOptions
                .filter((b) => b.value !== 'all')
                .map((b) => (
                  <MenuItem key={b.value} value={b.value}>
                    {b.label}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            label="Petty Cash Deduction"
            name="pettyCash"
            type="number"
            value={pettyForm.pettyCash}
            onChange={handlePettyFormChange}
            fullWidth
            margin="normal"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountBalanceWallet />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Deposited Amount"
            name="depositedAmount"
            type="number"
            value={pettyForm.depositedAmount}
            InputProps={{
              readOnly: true,
              startAdornment: (
                <InputAdornment position="start">
                  <Savings />
                </InputAdornment>
              ),
            }}
            fullWidth
            margin="normal"
            variant="outlined"
          />

          <TextField
            label="Remarks"
            name="remarks"
            value={pettyForm.remarks}
            onChange={handlePettyFormChange}
            fullWidth
            multiline
            rows={3}
            margin="normal"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EditNote />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'flex-end', p: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitConsolidatedPetty}
            disabled={!pettyForm.pettyCash || pettyForm.pettyCash <= 0}
            startIcon={<Save />}
          >
            Save Petty Cash
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Expense Form Dialog */}
      <Dialog
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: 6,
            p: 3,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptLongIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Add New Expense
              </Typography>
            </Box>
            <IconButton onClick={() => setExpenseFormOpen(false)} sx={{ '&:hover': { color: 'error.main' } }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Branch</InputLabel>
                <Select
                  name="BranchID"
                  value={expenseForm.BranchID}
                  onChange={handleExpenseChange}
                  startAdornment={<StoreIcon sx={{ mr: 1 }} />}
                >
                  <MenuItem value="">
                    <em>-- Select Branch --</em>
                  </MenuItem>
                  {branchOptions
                    .filter((b) => b.value !== 'all')
                    .map((b) => (
                      <MenuItem key={b.value} value={b.value}>
                        {b.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Business Type</InputLabel>
              <Select
                name="BusinessType"
                label="Business Type"
                value={expenseForm.BusinessType || ''}
                onChange={handleExpenseChange}
                startAdornment={<StoreIcon sx={{ mr: 1 }} />}
              >
                <MenuItem value="">
                  <em>-- Select Biz Type --</em>
                </MenuItem>
                <MenuItem value="Gym">Gym</MenuItem>
                <MenuItem value="Cafe">Cafe</MenuItem>
                <MenuItem value="Yogurt">Yogurt</MenuItem>
                <MenuItem value="Yogurt Cafe">Yogurt Cafe</MenuItem>
              </Select>
            </FormControl>
          </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expense Date"
                type="date"
                fullWidth
                name="ExpenseDate"
                value={expenseForm.ExpenseDate}
                onChange={handleExpenseChange}
                InputLabelProps={{ shrink: true }}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <HistoryIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Category"
                fullWidth
                name="ExpenseCategory"
                value={expenseForm.ExpenseCategory}
                onChange={handleExpenseChange}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MiscellaneousServices />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Amount"
                type="number"
                fullWidth
                name="Amount"
                value={expenseForm.Amount}
                onChange={handleExpenseChange}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontWeight: 'bold' }}>₱</Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Payment Method"
                fullWidth
                name="PaymentMethod"
                value={expenseForm.PaymentMethod}
                onChange={handleExpenseChange}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CreditCardIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Staff ID (optional)"
                fullWidth
                name="StaffID"
                value={expenseForm.StaffID}
                onChange={handleExpenseChange}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                name="Notes"
                value={expenseForm.Notes}
                onChange={handleExpenseChange}
                size="small"
                multiline
                rows={2}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EditNoteIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end', py: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitExpense}
            disabled={
              !expenseForm.BranchID ||
              !expenseForm.ExpenseDate ||
              !expenseForm.ExpenseCategory ||
              parseFloat(expenseForm.Amount) <= 0 ||
              !expenseForm.PaymentMethod
            }
            sx={{ textTransform: 'none' }}
          >
            <SaveIcon sx={{ mr: 1 }} />
            Save Expense
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Cash Flow Dialog */}
      <Dialog
        open={cashFlowDialogOpen}
        onClose={handleCloseCashFlowDialog}
        fullWidth
        maxWidth="md"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: 6,
            p: 3,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCardIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Record Yogurt/Cafe Daily Cash Flow Entry
              </Typography>
            </Box>
            <IconButton onClick={handleCloseCashFlowDialog} sx={{ '&:hover': { color: 'error.main' } }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <StoreIcon /> Yogurt or Cafe?
              </Typography>
              <FormControl fullWidth size="medium" sx={{ mb: 2 }}>
                <InputLabel>Branch</InputLabel>
                <Select name="BranchID" value={cashFlowForm.BranchID} onChange={handleCashFlowChange}>
                  <MenuItem value="">
                    <em>-- Select Branch --</em>
                  </MenuItem>
                  {branchOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="medium" sx={{ mb: 2 }}>
                <InputLabel>Business Type</InputLabel>
                <Select name="BusinessType" value={cashFlowForm.BusinessType} onChange={handleCashFlowChange}>
                  <MenuItem value="">
                    <em>-- Select --</em>
                  </MenuItem>
                  <MenuItem value="Cafe">Cafe</MenuItem>
                  <MenuItem value="Yogurt">Yogurt</MenuItem>
                  <MenuItem value="Yogurt Cafe">Yogurt Cafe</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                type="date"
                label="Date"
                name="Date"
                value={cashFlowForm.Date}
                onChange={handleCashFlowChange}
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Typography component="span" sx={{ fontWeight: 'bold' }}>
                  ₱
                </Typography>{' '}
                Sales Breakdown
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Cash Sales"
                name="CashSales"
                value={cashFlowForm.CashSales}
                onChange={handleCashFlowChange}
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="number"
                label="GCash Sales"
                name="GCashSales"
                value={cashFlowForm.GCashSales}
                onChange={handleCashFlowChange}
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="number"
                label="BPI Sales"
                name="BPISales"
                value={cashFlowForm.BPISales}
                onChange={handleCashFlowChange}
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                type="number"
                label="BDO Sales"
                name="BDOSales"
                value={cashFlowForm.BDOSales}
                onChange={handleCashFlowChange}
                variant="outlined"
                size="medium"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotesIcon /> Remarks
              </Typography>
              <TextField
                fullWidth
                label="Remarks"
                name="Remarks"
                value={cashFlowForm.Remarks}
                onChange={handleCashFlowChange}
                variant="outlined"
                size="medium"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end', py: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCashFlowSubmit}
            disabled={
              !cashFlowForm.BranchID ||
              !cashFlowForm.BusinessType ||
              !cashFlowForm.Date ||
              (
                parseFloat(cashFlowForm.CashSales) <= 0 &&
                parseFloat(cashFlowForm.GCashSales) <= 0 &&
                parseFloat(cashFlowForm.BPISales) <= 0 &&
                parseFloat(cashFlowForm.BDOSales) <= 0
              )
            }
            sx={{ textTransform: 'none' }}
          >
            <SaveIcon sx={{ mr: 1 }} />
            Submit Cash Flow
          </Button>
        </DialogActions>
      </Dialog>

      {/* [ADDED] Daily Petty Dialog (for each flow row) */}
      <Dialog
        open={dailyPettyOpen}
        onClose={closeDailyPettyDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Set Petty Cash (Daily)</DialogTitle>
        <DialogContent dividers>
          {selectedDailyFlow && (
            <>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Date:</strong> {formatDate(selectedDailyFlow.Date)}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Business:</strong> {selectedDailyFlow.BusinessType}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Net Profit:</strong> ₱{Number(selectedDailyFlow.NetProfit || 0).toLocaleString()}
              </Typography>
            </>
          )}

          {/* Original Petty Cash field */}
          <TextField
            label="Petty Cash"
            name="pettyCash"
            type="number"
            value={dailyPettyForm.pettyCash}
            onChange={handleDailyPettyChange}
            fullWidth
            sx={{ mb: 2 }}
          />

          {/* NEW FIELD FOR PETTY CASH TOMORROW */}
          <TextField
            label="Petty for Tomorrow"
            name="pettyCashTomorrow"
            type="number"
            value={dailyPettyForm.pettyCashTomorrow}
            onChange={handleDailyPettyChange}
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="Remarks"
            name="remarks"
            value={dailyPettyForm.remarks}
            onChange={handleDailyPettyChange}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDailyPettyDialog} color="error" startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmitDailyPetty} startIcon={<Save />}>
            Save Petty
          </Button>
        </DialogActions>
      </Dialog>


      {/* SNACKBAR FOR SUCCESS MESSAGES */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message={snackMessage}
      />
    </Box>
  );
}
