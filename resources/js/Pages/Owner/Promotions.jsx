import React, { useState, useEffect } from "react";
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
  Divider
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

// Icons for Overview Cards
import StarsIcon from "@mui/icons-material/Stars";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RedeemIcon from "@mui/icons-material/Redeem";

// PDF/CSV
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Charts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

export default function PromotionsSegments() {
  // ------------------------------------------------------------------------
  // 1) CSRF Token for all requests
  // ------------------------------------------------------------------------
  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');

  // ------------------------------------------------------------------------
  // 2) Branch List (Optional) from /owner/branches
  //    If your promotions table doesn't store BranchID, you can skip or
  //    adapt logic for demonstration.
  // ------------------------------------------------------------------------
  const [branches, setBranches] = useState([]);
  const fetchBranches = () => {
    fetch("/owner/branches", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest"
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setBranches(data.branches || []);
      })
      .catch((err) => console.error("Error fetching branches:", err));
  };
  useEffect(() => {
    fetchBranches();
  }, []);

  // ------------------------------------------------------------------------
  // 3) Promotions (GET /finance/promotions)
  // ------------------------------------------------------------------------
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPromotions = () => {
    setLoading(true);
    fetch("/finance/promotions", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest"
      }
    })
      .then((res) => res.json())
      .then((data) => {
        // data.promos should be an array
        setPromotions(data.promos || []);
      })
      .catch((err) => console.error("Error fetching promotions:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  // ------------------------------------------------------------------------
  // 4) Search & Branch Filter
  // ------------------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");

  // If your promotions table doesn't have a real BranchID,
  // you might store it in TermsAndConditions or a "branch" column if you add one.
  // For demonstration, let's assume there's a "Branch" field in the DB or stored in TermsAndConditions.
  // We'll pretend there's a field named "Branch" in promotions. If not, remove this section.
  const branchFilteredPromotions =
    selectedBranch === "All"
      ? promotions
      : promotions.filter(
          (p) =>
            (p.Branch || "") === selectedBranch
        );

  const filteredPromotions = branchFilteredPromotions.filter((p) =>
    Object.values(p).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // ------------------------------------------------------------------------
  // 5) Overview Stats (Active, Inactive, Expired, etc.)
  //    Adjust logic if you want "Upcoming" or date-based checks
  // ------------------------------------------------------------------------
  const activePromosCount = promotions.filter((p) => p.Status === "Active").length;
  const inactivePromosCount = promotions.filter((p) => p.Status === "Inactive").length;
  const expiredPromosCount = promotions.filter((p) => p.Status === "Expired").length;
  // If you track redemptions in the DB, update logic accordingly
  const totalRedemptions = 0;

  // ------------------------------------------------------------------------
  // 6) MUI DataGrid columns
  // ------------------------------------------------------------------------
  const columns = [
    { field: "PromotionID", headerName: "Promo ID", width: 90 },
    { field: "Name", headerName: "Name", width: 160 },
    { field: "DiscountType", headerName: "Type", width: 120 },
    { field: "DiscountValue", headerName: "Value", width: 90 },
    { field: "StartDate", headerName: "Start", width: 110 },
    { field: "EndDate", headerName: "End", width: 110 },
    { field: "Status", headerName: "Status", width: 100 },
    {
      field: "Actions",
      headerName: "Actions",
      width: 270,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#4caf50", minWidth: 40 }}
              onClick={() => handleViewPromo(params.row)}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#2196f3", minWidth: 40 }}
              onClick={() => handleEditPromo(params.row)}
            >
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Toggle Status">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#ff9800", minWidth: 40 }}
              onClick={() => handleTogglePromotion(params.row.PromotionID)}
            >
              <StarsIcon />
            </Button>
          </Tooltip>
          {/* If you wanted a real "delete" route, you'd add it in the backend. 
              For now, let's do local removal or no-op. */}
          <Tooltip title="Delete (local)">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#f44336", minWidth: 40 }}
              onClick={() => handleLocalDelete(params.row.PromotionID)}
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        </Box>
      )
    }
  ];

  const getRowId = (row) => row.PromotionID;

  // ------------------------------------------------------------------------
  // 7) View Promotion
  // ------------------------------------------------------------------------
  const [isViewOpen, setViewOpen] = useState(false);
  const [viewPromo, setViewPromo] = useState(null);

  const handleViewPromo = (promo) => {
    setViewPromo(promo);
    setViewOpen(true);
  };

  // ------------------------------------------------------------------------
  // 8) Add Promotion
  // ------------------------------------------------------------------------
  const [isAddOpen, setAddOpen] = useState(false);
  const [newPromo, setNewPromo] = useState({
    PromotionID: null, // omit => new
    Name: "",
    DiscountType: "Percentage",
    DiscountValue: "",
    StartDate: "",
    EndDate: "",
    TermsAndConditions: "",
    Status: "Active"
    // Branch: "" // If you have a branch column
  });
  const [addError, setAddError] = useState("");

  const handleOpenAdd = () => {
    setNewPromo({
      PromotionID: null,
      Name: "",
      DiscountType: "Percentage",
      DiscountValue: "",
      StartDate: "",
      EndDate: "",
      TermsAndConditions: "",
      Status: "Active"
      // Branch: ""
    });
    setAddError("");
    setAddOpen(true);
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setNewPromo((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = () => {
    if (!newPromo.Name || !newPromo.DiscountType) {
      setAddError("Please fill out required fields (Name, DiscountType).");
      return;
    }
    // Map front-end fields to controller
    const payload = { ...newPromo };
    // PromotionID: null => create new
    if (!payload.PromotionID) delete payload.PromotionID;

    fetch("/finance/promotions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save promotion");
        return res.text();
      })
      .then(() => {
        setAddOpen(false);
        fetchPromotions();
      })
      .catch((err) => {
        console.error(err);
        setAddError("Error saving promotion.");
      });
  };

  // ------------------------------------------------------------------------
  // 9) Edit Promotion
  // ------------------------------------------------------------------------
  const [isEditOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const handleEditPromo = (promo) => {
    setEditData({ ...promo });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = () => {
    if (!editData.Name || !editData.DiscountType) {
      alert("Please fill out required fields (Name, DiscountType).");
      return;
    }

    // Payload includes PromotionID => update
    fetch("/finance/promotions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify(editData)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update promotion");
        return res.text();
      })
      .then(() => {
        setEditOpen(false);
        fetchPromotions();
      })
      .catch((err) => {
        console.error(err);
        alert("Error updating promotion.");
      });
  };

  // ------------------------------------------------------------------------
  // 10) Toggle Promotion Status
  // ------------------------------------------------------------------------
  const handleTogglePromotion = (id) => {
    fetch(`/finance/promotions/${id}/toggle`, {
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest"
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Toggle failed");
        return res.text();
      })
      .then(() => {
        fetchPromotions();
      })
      .catch((err) => console.error(err));
  };

  // ------------------------------------------------------------------------
  // 11) Delete (Local Only) 
  //     If you want a real delete, define a route and method in your backend.
  // ------------------------------------------------------------------------
  const handleLocalDelete = (id) => {
    if (!window.confirm("Remove from UI? (No actual DB deletion)")) return;
    setPromotions((prev) => prev.filter((p) => p.PromotionID !== id));
  };

  // ------------------------------------------------------------------------
  // 12) Export (CSV/PDF)
  // ------------------------------------------------------------------------
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  const handleExportMenuOpen = (event) => {
    setExportAnchorEl(event.currentTarget);
  };
  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };

  // CSV
  const csvHeaders = [
    { label: "ID", key: "PromotionID" },
    { label: "Name", key: "Name" },
    { label: "Type", key: "DiscountType" },
    { label: "Value", key: "DiscountValue" },
    { label: "Start", key: "StartDate" },
    { label: "End", key: "EndDate" },
    { label: "Status", key: "Status" },
    { label: "T&C", key: "TermsAndConditions" }
  ];
  const csvData = filteredPromotions;

  // PDF
  const handleExportPDF = () => {
    handleExportMenuClose();
    const doc = new jsPDF();
    doc.text("Promotions Export", 14, 10);
    const bodyData = filteredPromotions.map((p) => [
      p.PromotionID,
      p.Name,
      p.DiscountType,
      p.DiscountValue,
      p.StartDate || "",
      p.EndDate || "",
      p.Status || "",
      p.TermsAndConditions || ""
    ]);
    doc.autoTable({
      head: [["ID", "Name", "Type", "Value", "Start", "End", "Status", "T&C"]],
      body: bodyData,
      startY: 20
    });
    doc.save("Promotions.pdf");
  };

  // ------------------------------------------------------------------------
  // 13) Charts (Line, Doughnut) examples
  // ------------------------------------------------------------------------
  const lineChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Promotions Used",
        data: [5, 12, 8, 15, 10, 20],
        fill: false,
        borderColor: "#4caf50",
        tension: 0.2
      }
    ]
  };
  const lineChartOptions = {
    responsive: true,
    plugins: { legend: { display: true }, title: { display: false } },
    scales: { y: { beginAtZero: true } }
  };
  const donutData = {
    labels: ["Active", "Inactive", "Expired"],
    datasets: [
      {
        data: [activePromosCount, inactivePromosCount, expiredPromosCount],
        backgroundColor: ["#4caf50", "#ff9800", "#f44336"]
      }
    ]
  };
  const donutOptions = {
    responsive: true,
    plugins: { legend: { position: "bottom" } },
    maintainAspectRatio: false
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* TOP FILTERS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Active Promotions */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: "text.primary", color: "background.paper", p: 2, display: "flex", alignItems: "center" }}>
                <StarsIcon sx={{ fontSize: 40, color: "#ffd700", mr: 2 }} />
                <CardContent>
                  <Typography variant="subtitle1">Active Promotions</Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {activePromosCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Inactive Promotions */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: "text.primary", color: "background.paper", p: 2, display: "flex", alignItems: "center" }}>
                <CalendarTodayIcon sx={{ fontSize: 40, color: "#2196f3", mr: 2 }} />
                <CardContent>
                  <Typography variant="subtitle1">Inactive Promotions</Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {inactivePromosCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Expired Promotions */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: "text.primary", color: "background.paper", p: 2, display: "flex", alignItems: "center" }}>
                <WarningAmberIcon sx={{ fontSize: 40, color: "red", mr: 2 }} />
                <CardContent>
                  <Typography variant="subtitle1">Expired Promotions</Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {expiredPromosCount}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Redemptions */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: "text.primary", color: "background.paper", p: 2, display: "flex", alignItems: "center" }}>
                <RedeemIcon sx={{ fontSize: 40, color: "#ffca28", mr: 2 }} />
                <CardContent>
                  <Typography variant="subtitle1">Total Redemptions</Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {totalRedemptions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>



      {/* HEADER + EXPORT + ADD BUTTONS */}
      <Typography variant="h4" gutterBottom>
        Promotions & Segments
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <TextField
        variant="outlined"
        size="small"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ width: 250 }}
      />
    
          <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={fetchPromotions}>
        Refresh
      </Button>
            <Button
              variant="outlined"
              onClick={handleExportMenuOpen}
              startIcon={<FileDownloadIcon />}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportAnchorEl}
              open={openExportMenu}
              onClose={handleExportMenuClose}
            >
              <MenuItem>
                <CSVLink
                  data={csvData}
                  headers={csvHeaders}
                  filename="Promotions.csv"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Export CSV
                </CSVLink>
              </MenuItem>
              <MenuItem onClick={handleExportPDF}>Export PDF</MenuItem>
            </Menu>

            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
            >
              Add Promotion
            </Button>
          </Box>
        </Box>

        {/* DATA GRID */}
        <div style={{ height: 460, width: "100%" }}>
          <DataGrid
            rows={filteredPromotions}
            columns={columns}
            getRowId={getRowId}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
            loading={loading}
          />
        </div>
      </Paper>

      {/* ADD PROMOTION DIALOG */}
      <Dialog open={isAddOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Promotion</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Name"
            name="Name"
            fullWidth
            margin="normal"
            value={newPromo.Name}
            onChange={handleAddChange}
          />
          <TextField
            label="Discount Type"
            name="DiscountType"
            fullWidth
            margin="normal"
            value={newPromo.DiscountType}
            onChange={handleAddChange}
          />
          <TextField
            label="Discount Value"
            name="DiscountValue"
            fullWidth
            margin="normal"
            value={newPromo.DiscountValue}
            onChange={handleAddChange}
          />
          <TextField
            label="Start Date"
            name="StartDate"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={newPromo.StartDate}
            onChange={handleAddChange}
          />
          <TextField
            label="End Date"
            name="EndDate"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={newPromo.EndDate}
            onChange={handleAddChange}
          />
          <TextField
            label="Terms & Conditions"
            name="TermsAndConditions"
            multiline
            rows={2}
            fullWidth
            margin="normal"
            value={newPromo.TermsAndConditions}
            onChange={handleAddChange}
          />
          <TextField
            label="Status"
            name="Status"
            fullWidth
            margin="normal"
            value={newPromo.Status}
            onChange={handleAddChange}
          />
          {/* If you have a "Branch" column in promotions, you could add it here:
            <FormControl fullWidth margin="normal">
              <InputLabel>Select Branch</InputLabel>
              <Select
                name="Branch"
                value={newPromo.Branch || ""}
                onChange={handleAddChange}
              >
                {branches.map((b) => (
                  <MenuItem key={b.BranchID} value={b.BranchName}>
                    {b.BranchName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          */}
          {addError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {addError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* VIEW PROMO DIALOG */}
      <Dialog open={isViewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Promotion Details</DialogTitle>
        <DialogContent dividers>
          {viewPromo && (
            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    ID:
                  </Typography>
                  <Typography variant="body1">{viewPromo.PromotionID}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Name:
                  </Typography>
                  <Typography variant="body1">{viewPromo.Name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Type:
                  </Typography>
                  <Typography variant="body1">{viewPromo.DiscountType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Value:
                  </Typography>
                  <Typography variant="body1">{viewPromo.DiscountValue}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Start:
                  </Typography>
                  <Typography variant="body1">{viewPromo.StartDate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    End:
                  </Typography>
                  <Typography variant="body1">{viewPromo.EndDate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Typography variant="body1">{viewPromo.Status}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Terms & Conditions:
                  </Typography>
                  <Typography variant="body1">
                    {viewPromo.TermsAndConditions}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT PROMO DIALOG */}
      <Dialog open={isEditOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Promotion</DialogTitle>
        <DialogContent dividers>
          {editData && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Promotion ID"
                value={editData.PromotionID}
                disabled
              />
              <TextField
                label="Name"
                name="Name"
                value={editData.Name}
                onChange={handleEditChange}
              />
              <TextField
                label="Type"
                name="DiscountType"
                value={editData.DiscountType}
                onChange={handleEditChange}
              />
              <TextField
                label="Value"
                name="DiscountValue"
                value={editData.DiscountValue}
                onChange={handleEditChange}
              />
              <TextField
                label="Start Date"
                name="StartDate"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={editData.StartDate || ""}
                onChange={handleEditChange}
              />
              <TextField
                label="End Date"
                name="EndDate"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={editData.EndDate || ""}
                onChange={handleEditChange}
              />
              <TextField
                label="Status"
                name="Status"
                value={editData.Status}
                onChange={handleEditChange}
              />
              <TextField
                label="Terms & Conditions"
                name="TermsAndConditions"
                multiline
                rows={2}
                value={editData.TermsAndConditions || ""}
                onChange={handleEditChange}
              />
              {/* If you have a Branch field:
                <FormControl fullWidth>
                  <InputLabel>Branch</InputLabel>
                  <Select
                    name="Branch"
                    value={editData.Branch || ""}
                    onChange={handleEditChange}
                  >
                    {branches.map(b => (
                      <MenuItem key={b.BranchID} value={b.BranchName}>
                        {b.BranchName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              */}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
