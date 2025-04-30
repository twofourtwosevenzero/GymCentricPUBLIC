import React, { Suspense, useState, useEffect, useMemo, useCallback } from "react";
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
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import ArchiveIcon from "@mui/icons-material/Archive";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import ListAltIcon from "@mui/icons-material/ListAlt";
import EventNoteIcon from "@mui/icons-material/EventNote";
import EngineeringIcon from "@mui/icons-material/Engineering";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Chart.js registration remains the same:
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

// Lazy load chart components from react-chartjs-2
const LazyLine = React.lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Line }))
);
const LazyDoughnut = React.lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Doughnut }))
);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

const csrfToken = document
  .querySelector('meta[name="csrf-token"]')
  ?.getAttribute("content");

// Custom hook for debouncing search input
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Helper to parse details JSON and append extra info
function parseAndAppendDetails(details) {
  if (!details) return "—";
  try {
    const parsed = JSON.parse(details);
    parsed.__appendedInfo = "Additional words and characters appended here";
    return JSON.stringify(parsed, null, 2);
  } catch (err) {
    return details + "\n\n(Additional words and characters appended here)";
  }
}

export default function SystemLogs() {
  const theme = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const formatDateTime = useCallback((dateString) => {
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
  }, []);

  // ------------------ Filter Input States ------------------
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [branchOptions, setBranchOptions] = useState(["All Branches"]);
  const [selectedBranch, setSelectedBranch] = useState("All Branches");

  const [dateRange, setDateRange] = useState("last7days");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ------------------ Applied Filters State ------------------
  const [appliedFilters, setAppliedFilters] = useState({
    selectedBranch: "All Branches",
    dateRange: "last7days",
    dateFrom: "",
    dateTo: "",
  });

  // ------------------ Fetch Logs on Mount ------------------
  useEffect(() => {
    setLoading(true);
    fetch("/system/logs", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch logs");
        return res.json();
      })
      .then((data) => {
        setLogs(data.logs || []);
      })
      .catch((err) => console.error("Error:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/owner/branches", {
      method: "GET",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch branches");
        return res.json();
      })
      .then((data) => {
        if (data.branches) {
          // Suppose each branch has { BranchID, BranchName }
          const fetched = data.branches.map((b) => b.BranchName);
          setBranchOptions(["All Branches", ...fetched]);
        }
      })
      .catch((err) => console.error("Error fetching branches:", err));
  }, []);

  // ------------------ Overview Stats ------------------
  const totalLogsCount = logs.length;
  const criticalActionsCount = useMemo(
    () => logs.filter((l) => l.logType === "Critical").length,
    [logs]
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const userActivityTodayCount = useMemo(
    () => logs.filter((l) => l.timestamp.startsWith(todayStr)).length,
    [logs, todayStr]
  );
  const mostActiveModule = "Membership Management (45 Actions This Week)";

  // ------------------ Filtering ------------------
  const filteredLogs = useMemo(() => {
    let logsToFilter = logs;

    if (appliedFilters.selectedBranch !== "All Branches") {
      logsToFilter = logsToFilter.filter(
        (log) => (log.branch || "") === appliedFilters.selectedBranch
      );
    }

    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      if (appliedFilters.dateFrom) {
        logsToFilter = logsToFilter.filter(
          (log) => new Date(log.timestamp) >= new Date(appliedFilters.dateFrom)
        );
      }
      if (appliedFilters.dateTo) {
        logsToFilter = logsToFilter.filter(
          (log) => new Date(log.timestamp) <= new Date(appliedFilters.dateTo)
        );
      }
    } else if (appliedFilters.dateRange) {
      let fromDate = null;
      const now = new Date();
      if (appliedFilters.dateRange === "last7days") {
        fromDate = new Date();
        fromDate.setDate(now.getDate() - 7);
      } else if (appliedFilters.dateRange === "lastMonth") {
        fromDate = new Date();
        fromDate.setMonth(now.getMonth() - 1);
      } else if (appliedFilters.dateRange === "lastYear") {
        fromDate = new Date();
        fromDate.setFullYear(now.getFullYear() - 1);
      }
      if (fromDate) {
        logsToFilter = logsToFilter.filter(
          (log) => new Date(log.timestamp) >= fromDate
        );
      }
    }

    if (debouncedSearchTerm) {
      logsToFilter = logsToFilter.filter((log) =>
        Object.values(log).some((val) =>
          String(val).toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      );
    }

    return logsToFilter;
  }, [logs, appliedFilters, debouncedSearchTerm]);

  // ------------------ Filter Button Handler ------------------
  const applyFilters = useCallback(() => {
    setAppliedFilters({
      selectedBranch,
      dateRange,
      dateFrom,
      dateTo,
    });
  }, [selectedBranch, dateRange, dateFrom, dateTo]);
  
  // ------------------ Build Chart Data ------------------
  const lineChartData = useMemo(() => {
    const countsByDate = {};
    logs.forEach((log) => {
      const dateOnly = log.timestamp.slice(0, 10);
      countsByDate[dateOnly] = (countsByDate[dateOnly] || 0) + 1;
    });
    const sortedDates = Object.keys(countsByDate).sort();
    const counts = sortedDates.map((d) => countsByDate[d]);

    return {
      labels: sortedDates,
      datasets: [
        {
          label: "Number of Logs",
          data: counts,
          borderColor: "#42a5f5",
          backgroundColor: "rgba(66,165,245,0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [logs]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
      maintainAspectRatio: false,
    }),
    []
  );

  const modulesChartData = useMemo(() => {
    const countsByModule = {};
    logs.forEach((log) => {
      const mod = log.module || "Unknown";
      countsByModule[mod] = (countsByModule[mod] || 0) + 1;
    });
    const modules = Object.keys(countsByModule);
    const counts = modules.map((m) => countsByModule[m]);

    return {
      labels: modules,
      datasets: [
        {
          data: counts,
          backgroundColor: [
            "#66bb6a",
            "#ef5350",
            "#26c6da",
            "#ffca28",
            "#ab47bc",
            "#ffa726",
            "#8d6e63",
          ],
        },
      ],
    };
  }, [logs]);

  const modulesOptions = useMemo(
    () => ({
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      maintainAspectRatio: false,
    }),
    []
  );

  // ------------------ DataGrid Columns ------------------
  const columns = useMemo(
    () => [
      { field: "logId", headerName: "Log ID", width: 100 },
      {
        field: "timestamp",
        headerName: "Timestamp",
        width: 160,
        renderCell: (params) =>
          params.value ? formatDateTime(params.value) : "—",
      },
      { field: "user", headerName: "User", width: 120 },
      { field: "actionDesc", headerName: "Action Description", width: 200 },
      { field: "module", headerName: "Module", width: 140 },
      {
        field: "logType",
        headerName: "Log Type",
        width: 120,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {params.value === "Critical" ? (
              <ErrorIcon sx={{ color: "#f44336" }} />
            ) : (
              <InfoIcon sx={{ color: "#2196f3" }} />
            )}
            <Typography>{params.value}</Typography>
          </Box>
        ),
      },
      {
        field: "Actions",
        headerName: "Actions",
        width: 220,
        sortable: false,
        renderCell: (params) => (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="View Log Details">
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "#4caf50",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#43a047" },
                  minWidth: "40px",
                  padding: "6px",
                }}
                onClick={() => handleViewLog(params.row)}
              >
                <VisibilityIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Archive Log (local only)">
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "#9e9e9e",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#757575" },
                  minWidth: "40px",
                  padding: "6px",
                }}
                onClick={() => handleArchiveLog(params.row.logId)}
              >
                <ArchiveIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Delete Log (backend)">
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "#f44336",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#d32f2f" },
                  minWidth: "40px",
                  padding: "6px",
                }}
                onClick={() => handleDeleteLog(params.row.logId)}
              >
                <DeleteIcon />
              </Button>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [formatDateTime]
  );

  const getRowId = useCallback((row) => row.logId, []);

  // ------------------ Handlers: View, Archive, Delete ------------------
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLogData, setViewLogData] = useState(null);

  const handleViewLog = useCallback((row) => {
    setViewLogData(row);
    setViewOpen(true);
  }, []);

  const [confirmArchiveLogId, setConfirmArchiveLogId] = useState(null);
  const handleArchiveLog = useCallback((logId) => {
    setConfirmArchiveLogId(logId);
  }, []);

  const confirmArchive = useCallback(() => {
    setLogs((prev) => prev.filter((l) => l.logId !== confirmArchiveLogId));
    setConfirmArchiveLogId(null);
  }, [confirmArchiveLogId]);

  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState(null);
  const handleDeleteLog = useCallback((logId) => {
    setConfirmDeleteLogId(logId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!confirmDeleteLogId) return;
    const numericId = confirmDeleteLogId.split("-")[1] || "";
    fetch(`/system/logs/${numericId}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Delete failed");
        setLogs((prev) => prev.filter((l) => l.logId !== confirmDeleteLogId));
        setConfirmDeleteLogId(null);
      })
      .catch((err) => console.error("Error deleting log:", err));
  }, [confirmDeleteLogId]);

  // ------------------ Export (CSV/PDF) ------------------
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  const handleExportMenuOpen = useCallback((e) => {
    setExportAnchorEl(e.currentTarget);
  }, []);
  const handleExportMenuClose = useCallback(() => {
    setExportAnchorEl(null);
  }, []);

  const csvHeaders = useMemo(
    () => [
      { label: "Log ID", key: "logId" },
      { label: "Timestamp", key: "timestamp" },
      { label: "User", key: "user" },
      { label: "ActionDesc", key: "actionDesc" },
      { label: "Module", key: "module" },
      { label: "LogType", key: "logType" },
    ],
    []
  );

  const csvData = filteredLogs;

  const handleExportCSV = useCallback(() => {
    handleExportMenuClose();
  }, [handleExportMenuClose]);

  const handleExportPDF = useCallback(() => {
    handleExportMenuClose();
    if (!filteredLogs || filteredLogs.length === 0) {
      alert("No system logs available to export.");
      return;
    }
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const coverPage = "/imgs/coverpage2.png";
    const title = "System Logs Report";
    const tableHeaders = ["Log ID", "Timestamp", "User", "Action", "Module", "Log Type"];
    const tableBody = filteredLogs.map((l) => [
      l?.logId || "N/A",
      formatDateTime(l?.timestamp),
      l?.user || "N/A",
      l?.actionDesc || "N/A",
      l?.module || "N/A",
      l?.logType || "N/A",
    ]);
    if (!tableBody || tableBody.length === 0) {
      alert("No records to export.");
      return;
    }
    doc.addImage(coverPage, "PNG", 0, 0, pageWidth, pageHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor("#ffffff");
    doc.text(title, pageWidth / 2, 100, { align: "center" });
    doc.setFontSize(14);
    doc.text("Generated on: " + new Date().toLocaleDateString(), pageWidth / 2, 130, { align: "center" });
    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 100,
      theme: "striped",
      headStyles: { fillColor: "#050505", textColor: "#ffffff", fontStyle: "bold", fontSize: 10 },
      bodyStyles: { textColor: "#333333", fontSize: 10 },
      alternateRowStyles: { fillColor: "#f5f5f5" },
      styles: { overflow: "linebreak", cellPadding: 5, halign: "center", valign: "middle" },
      margin: { top: 50, left: 20, right: 20, bottom: 20 },
      didDrawPage: (data) => {
        if (doc.internal.getNumberOfPages() > 1) {
          doc.addImage("/imgs/addpage2.png", "PNG", 0, 0, pageWidth, pageHeight);
        }
      },
    });
    doc.save("SystemLogs.pdf");
  }, [filteredLogs, formatDateTime, handleExportMenuClose]);

  return (
    <Box sx={{ p: 4 }}>
      {/* ---------- Overview Cards ---------- */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "text.primary", color: "background.paper", display: "flex", alignItems: "center", p: 1 }}>
            <ListAltIcon sx={{ fontSize: 40, color: "#42a5f5", mr: 2 }} />
            <CardContent>
              <Typography variant="h6">Total Logs</Typography>
              <Typography variant="h5">{totalLogsCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "text.primary", color: "background.paper", display: "flex", alignItems: "center", p: 1 }}>
            <ErrorIcon sx={{ fontSize: 40, color: "#e53935", mr: 2 }} />
            <CardContent>
              <Typography variant="h6">Critical Actions</Typography>
              <Typography variant="h5">{criticalActionsCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "text.primary", color: "background.paper", display: "flex", alignItems: "center", p: 1 }}>
            <EventNoteIcon sx={{ fontSize: 40, color: "#43a047", mr: 2 }} />
            <CardContent>
              <Typography variant="h6">Logs Today</Typography>
              <Typography variant="h5">{userActivityTodayCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "text.primary", color: "background.paper", display: "flex", alignItems: "center", p: 1 }}>
            <EngineeringIcon sx={{ fontSize: 40, color: "#ffca28", mr: 2 }} />
            <CardContent>
              <Typography variant="h7">Most Active Module</Typography>
              <Typography variant="body2">{mostActiveModule}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ---------- Charts ---------- */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400, display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Logs Over Time
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Suspense fallback={<div>Loading Chart...</div>}>
                <LazyLine data={lineChartData} options={lineOptions} />
              </Suspense>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400, display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Logs by Module
            </Typography>
            <Box sx={{ flex: 1 }}>
              <Suspense fallback={<div>Loading Chart...</div>}>
                <LazyDoughnut data={modulesChartData} options={modulesOptions} />
              </Suspense>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h4" gutterBottom>
        System Logs & Activity
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* ---------- Search + Export Buttons ---------- */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, gap: 2 }}>
          <TextField
            placeholder="Search"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: "100%", maxWidth: 300 }}
          />
          <Box>
            <Button variant="outlined" onClick={handleExportMenuOpen} startIcon={<FileDownloadIcon />}>
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
                  data={csvData}
                  headers={csvHeaders}
                  filename="SystemLogs.csv"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Export CSV
                </CSVLink>
              </MenuItem>
              <MenuItem onClick={handleExportPDF}>Export PDF</MenuItem>
            </Menu>
          </Box>
        </Box>

        <div style={{ height: 450, width: "100%" }}>
          <DataGrid
            rows={filteredLogs}
            columns={columns}
            getRowId={getRowId}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
            loading={loading}
          />
        </div>
      </Paper>

      {/* ---------- VIEW LOG DETAILS ---------- */}
      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
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
              <HistoryIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Log Details
              </Typography>
            </Box>
            <IconButton onClick={() => setViewOpen(false)} sx={{ "&:hover": { color: theme.palette.error.main } }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {viewLogData && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Log ID" variant="filled" InputProps={{ readOnly: true }} value={viewLogData.logId || "—"} />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Timestamp"
                  variant="filled"
                  InputProps={{ readOnly: true }}
                  value={formatDateTime(viewLogData.timestamp || "—")}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="User" variant="filled" InputProps={{ readOnly: true }} value={viewLogData.user || "—"} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Action" variant="filled" InputProps={{ readOnly: true }} value={viewLogData.actionDesc || "—"} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Module" variant="filled" InputProps={{ readOnly: true }} value={viewLogData.module || "—"} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Log Type" variant="filled" InputProps={{ readOnly: true }} value={viewLogData.logType || "—"} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Details"
                  variant="filled"
                  multiline
                  rows={6}
                  InputProps={{ readOnly: true }}
                  value={parseAndAppendDetails(viewLogData.details)}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------- Confirm Archive Dialog ---------- */}
      <Dialog
        open={Boolean(confirmArchiveLogId)}
        onClose={() => setConfirmArchiveLogId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Archive Log</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to archive this log (<strong>{confirmArchiveLogId}</strong>)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmArchiveLogId(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmArchive}>
            Archive
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------- Confirm Delete Dialog ---------- */}
      <Dialog
        open={Boolean(confirmDeleteLogId)}
        onClose={() => setConfirmDeleteLogId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Log</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete this log (<strong>{confirmDeleteLogId}</strong>)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteLogId(null)} sx={{ color: "gray" }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
