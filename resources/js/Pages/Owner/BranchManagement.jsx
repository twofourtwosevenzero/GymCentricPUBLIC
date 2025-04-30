// File: BranchManagement.jsx
import React, { useEffect, useState,  } from "react";
import axios from "axios";
import { route } from "ziggy-js";
import { useTheme } from "@mui/material/styles";

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
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  IconButton,
  Divider,
  InputAdornment,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import BusinessIcon from "@mui/icons-material/Business";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import BadgeIcon from "@mui/icons-material/Badge";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CloseIcon from "@mui/icons-material/Close";
import StoreIcon from "@mui/icons-material/Store";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from "@mui/icons-material/Phone";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import SaveIcon from '@mui/icons-material/Save';

import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function BranchManagement() {
  const theme = useTheme();
  // General loading & error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Searching & exporting
  const [searchTerm, setSearchTerm] = useState("");
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

  // Tab state: 0 = Branches, 1 = Facilities
  const [activeTab, setActiveTab] = useState(0);

  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState({ type: "", id: null });

  // Confirmation dialog
    const [openBranchConfirmation, setOpenBranchConfirmation] = useState(false);
    const [openFacilityConfirmation, setOpenFacilityConfirmation] = useState(false);

  // ============ Branch State & CRUD ============
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [isAddBranchOpen, setAddBranchOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    BranchName: "",
    Location: "",
    Status: "Active",
    Contact: "",
  });
  const [isEditBranchOpen, setEditBranchOpen] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [isViewBranchOpen, setViewBranchOpen] = useState(false);
  const [viewBranch, setViewBranch] = useState(null);

  // ============ Facility State & CRUD ============
  const [facilities, setFacilities] = useState([]);
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [isAddFacilityOpen, setAddFacilityOpen] = useState(false);
  const [newFacility, setNewFacility] = useState({
    BranchID: "",
    FacilityName: "",
    Description: "",
    Status: "Available",
  });
  const [isEditFacilityOpen, setEditFacilityOpen] = useState(false);
  const [editFacility, setEditFacility] = useState(null);
  const [isViewFacilityOpen, setViewFacilityOpen] = useState(false);
  const [viewFacility, setViewFacility] = useState(null);

  //ADD BRANCH VALIDATION:
  const [branchErrors, setBranchErrors] = useState({});

  const validateBranch = () => {
    let errors = {};
    if (!newBranch.BranchName.trim()) {
      errors.BranchName = "Branch Name is required.";
    }
    if (!newBranch.Location.trim()) {
      errors.Location = "Location is required.";
    }
    if (!newBranch.Status) {
      errors.Status = "Status is required.";
    }
    if (!newBranch.Contact.trim()) {
      errors.Contact = "Contact is required.";
    }
    return errors;
  };

    const handleBranchOpenConfirmation = () => {
          const errors = validateBranch();
        if (Object.keys(errors).length > 0) {
          setBranchErrors(errors);
          return;
        }
        setBranchErrors({});
      setOpenBranchConfirmation(true);
        };

  
  //ADD FACILITY VALIDATION:
    const [facilityErrors, setFacilityErrors] = useState({});

    const validateFacility = () => {
      let errors = {};
      if (!newFacility.BranchID) {
        errors.BranchID = "Branch is required.";
      }
      if (!newFacility.FacilityName.trim()) {
        errors.FacilityName = "Facility Name is required.";
      }
      if (!newFacility.Description.trim()) {
        errors.Description = "Description is required.";
      }
      if (!newFacility.Status) {
        errors.Status = "Status is required.";
      }
      return errors;
    };

     const handleFacilityOpenConfirmation = () => {
         const errors = validateFacility();
        if (Object.keys(errors).length > 0) {
           setFacilityErrors(errors);
           return;
         }
         setFacilityErrors({});
         setOpenFacilityConfirmation(true);
      };
 
  // ============ Lifecycle: Fetch on Mount ============
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [branchRes, facilityRes] = await Promise.all([
        axios.get(route("branches.index")),   // e.g. returns { branches: [...] }
        axios.get(route("facilities.index")), // e.g. returns { facilities: [...] }
      ]);

      const branchData = branchRes.data.branches || [];
      const facilityData = facilityRes.data.facilities || [];

      setBranches(branchData);
      setFilteredBranches(branchData);

      setFacilities(facilityData);
      setFilteredFacilities(facilityData);

      setLoading(false);
    } catch (err) {
      setError("Failed to load data");
      console.error("Data fetch error:", err);
      setLoading(false);
    }
  };

  // ---------------- TAB & SEARCH HANDLERS ----------------
  const handleTabChange = (e, newVal) => {
    setActiveTab(newVal);
    setSearchTerm("");

    if (newVal === 0) {
      // Branches
      setFilteredBranches(branches);
    } else {
      // Facilities
      setFilteredFacilities(facilities);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    if (activeTab === 0) {
      // Filter branches
      setFilteredBranches(
        branches.filter((b) =>
          Object.values(b).some((val) => String(val).toLowerCase().includes(value))
        )
      );
    } else {
      // Filter facilities
      setFilteredFacilities(
        facilities.filter((f) =>
          Object.values(f).some((val) => String(val).toLowerCase().includes(value))
        )
      );
    }
  };

  // ---------------- BRANCH CRUD ----------------
  const handleCreateBranch = async () => {
    try {
      const res = await axios.post(route("branches.store"), newBranch);
      setBranches((prev) => [...prev, res.data]);
      setFilteredBranches((prev) => [...prev, res.data]);
      setAddBranchOpen(false);
    } catch (err) {
      console.error("Create branch failed:", err);
    }
  };

  const handleUpdateBranch = async () => {
    try {
      const res = await axios.put(route("branches.update", editBranch.BranchID), editBranch);
      const updated = res.data;
      setBranches((prev) => prev.map((b) => (b.BranchID === updated.BranchID ? updated : b)));
      setFilteredBranches((prev) => prev.map((b) => (b.BranchID === updated.BranchID ? updated : b)));
      setEditBranchOpen(false);
    } catch (err) {
      console.error("Update branch failed:", err);
    }
  };

  const handleDeleteBranch = async (branchID) => {
    try {
      await axios.delete(route("branches.destroy", branchID));
      setBranches((prev) => prev.filter((b) => b.BranchID !== branchID));
      setFilteredBranches((prev) => prev.filter((b) => b.BranchID !== branchID));
    } catch (err) {
      console.error("Delete branch failed:", err);
    }
  };

  // ---------------- FACILITY CRUD ----------------
  const handleCreateFacility = async () => {
    try {
      const res = await axios.post(route("facilities.store"), newFacility);
      setFacilities((prev) => [...prev, res.data]);
      setFilteredFacilities((prev) => [...prev, res.data]);
      setAddFacilityOpen(false);
    } catch (err) {
      console.error("Create facility failed:", err);
    }
  };

  const handleUpdateFacility = async () => {
    try {
      const res = await axios.put(
        route("facilities.update", editFacility.FacilityID),
        editFacility
      );
      const updated = res.data;
      setFacilities((prev) =>
        prev.map((f) => (f.FacilityID === updated.FacilityID ? updated : f))
      );
      setFilteredFacilities((prev) =>
        prev.map((f) => (f.FacilityID === updated.FacilityID ? updated : f))
      );
      setEditFacilityOpen(false);
    } catch (err) {
      console.error("Update facility failed:", err);
    }
  };

  const handleDeleteFacility = async (facilityID) => {
    try {
      await axios.delete(route("facilities.destroy", facilityID));
      setFacilities((prev) => prev.filter((f) => f.FacilityID !== facilityID));
      setFilteredFacilities((prev) => prev.filter((f) => f.FacilityID !== facilityID));
    } catch (err) {
      console.error("Delete facility failed:", err);
    }
  };

  // ---------------- COLUMNS & ROWS ----------------
  const branchColumns = [
    { 
      field: "BranchID", 
      headerName: "ID", 
      width: 80,
      renderCell: (params) => params.value ?? "—",
    },
    { 
      field: "BranchName", 
      headerName: "Branch Name", 
      width: 180,
      renderCell: (params) => params.value ?? "—",
    },
    { 
      field: "Location", 
      headerName: "Location", 
      width: 180,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => {
        const val = params.value ?? "—";
        const color = val === "Active" ? "#4caf50" : "#757575"; // Green for Active, Gray for others
    
        return <span style={{ color, fontWeight: "bold" }}>{val}</span>;
      },
    },
    { 
      field: "Contact", 
      headerName: "Contact", 
      width: 140,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* VIEW */}
          <Tooltip title="View Branch">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#4caf50",
                color: "#fff",
                "&:hover": { backgroundColor: "#43a047" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => {
                setViewBranch(params.row);
                setViewBranchOpen(true);
              }}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>

          {/* EDIT */}
          <Tooltip title="Edit Branch">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#2196f3",
                color: "#fff",
                "&:hover": { backgroundColor: "#1976d2" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => {
                setEditBranch({ ...params.row });
                setEditBranchOpen(true);
              }}
            >
              <EditIcon />
            </Button>
          </Tooltip>

          {/* DELETE */}
          <Tooltip title="Delete Branch">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#f44336",
                color: "#fff",
                "&:hover": { backgroundColor: "#d32f2f" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => openDeleteDialog("branch", params.row.BranchID)}
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const facilityColumns = [
    { field: "FacilityID", headerName: "ID", width: 80 },
    { field: "FacilityName", headerName: "Facility Name", width: 180 },
    { field: "Description", headerName: "Description", width: 220 },
    {
      field: "Status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => {
        const val = params.value;
    
        const getStatusColor = (status) => {
          switch (status?.toLowerCase()) {
            case "available":
              return "#4caf50"; // Green
            case "under maintenance":
              return "#ff9800"; // Orange
            case "closed":
              return "#f44336"; // Red
            default:
              return "#757575"; // Grey
          }
        };
    
        return (
          <span style={{ color: getStatusColor(val), fontWeight: "bold" }}>
            {val}
          </span>
        );
      },
    },
    
    {
      field: "BranchID",
      headerName: "Branch",
      width: 130,
      renderCell: (params) => {
        // If you eager-loaded 'branch' in the controller, you can do:
        const row = params.row;
        return row.branch ? row.branch.BranchName : "—";
      },
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* VIEW */}
          <Tooltip title="View Facility">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#4caf50",
                color: "#fff",
                "&:hover": { backgroundColor: "#43a047" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => {
                setViewFacility(params.row);
                setViewFacilityOpen(true);
              }}
            >
              <VisibilityIcon />
            </Button>
          </Tooltip>

          {/* EDIT */}
          <Tooltip title="Edit Facility">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#2196f3",
                color: "#fff",
                "&:hover": { backgroundColor: "#1976d2" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => {
                setEditFacility({ ...params.row });
                setEditFacilityOpen(true);
              }}
            >
              <EditIcon />
            </Button>
          </Tooltip>

          {/* DELETE */}
          <Tooltip title="Delete Facility">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#f44336",
                color: "#fff",
                "&:hover": { backgroundColor: "#d32f2f" },
                minWidth: "40px",
                padding: "6px",
              }}
              onClick={() => openDeleteDialog("facility", params.row.FacilityID)}
            >
              <DeleteIcon />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Determine which columns & data to show based on the active tab
  const tableColumns = activeTab === 0 ? branchColumns : facilityColumns;
  const tableRows = activeTab === 0 ? filteredBranches : filteredFacilities;

  // CSV & PDF setups
  let csvHeaders = [];
  let csvFilename = "";

  if (activeTab === 0) {
    csvHeaders = [
      { label: "BranchID", key: "BranchID" },
      { label: "BranchName", key: "BranchName" },
      { label: "Location", key: "Location" },
      { label: "Status", key: "Status" },
      { label: "Contact", key: "Contact" },
    ];
    csvFilename = "BranchDirectory.csv";
  } else {
    csvHeaders = [
      { label: "FacilityID", key: "FacilityID" },
      { label: "FacilityName", key: "FacilityName" },
      { label: "Description", key: "Description" },
      { label: "Status", key: "Status" },
    ];
    csvFilename = "Facilities.csv";
  }

  // ============ Export PDF ============
  const handleExportMenuOpen = (event) => setExportAnchorEl(event.currentTarget);
  const handleExportMenuClose = () => setExportAnchorEl(null);
  const handleExportPDF = () => {
    handleExportMenuClose();
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
  
    // Background images for cover and (optionally) succeeding pages
    const coverPage = "/imgs/coverpage2.png";
    // const addPage = "/imgs/addpage2.png"; // Not used now
  
    let tableHeaders = [];
    let tableBody = [];
    let title = "";
    let filename = "";
  
    if (activeTab === 0) {
      title = "Branch Directory Export";
      filename = "BranchDirectory.pdf";
      tableHeaders = ["ID", "Name", "Location", "Status", "Contact"];
      tableBody = tableRows.map((b) => [
        b.BranchID,
        b.BranchName,
        b.Location,
        b.Status,
        b.Contact,
      ]);
    } else {
      title = "Facilities Export";
      filename = "Facilities.pdf";
      tableHeaders = ["ID", "Name", "Description", "Status"];
      tableBody = tableRows.map((f) => [
        f.FacilityID,
        f.FacilityName,
        f.Description,
        f.Status,
      ]);
    }
  
    // Draw the cover page background and header text (applied only on the first page)
    doc.addImage(coverPage, "PNG", 0, 0, pageWidth, pageHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor("#ffffff");
    doc.text(title, pageWidth / 2, 100, { align: "center" });
    doc.setFontSize(14);
    doc.text("Generated on: " + new Date().toLocaleDateString(), pageWidth / 2, 130, { align: "center" });
  
    // Generate the table starting below the header.
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
        fillColor: "#f0f4f7",
      },
      styles: {
        overflow: "linebreak",
        cellPadding: 5,
        halign: "center",
        valign: "middle",
      },
      margin: { top: 50, left: 20, right: 20, bottom: 20 },
      // Removed didDrawPage callback to avoid re‑adding backgrounds on subsequent pages
    });
  
    // Save the PDF with the correct filename
    doc.save(filename);
  };
  

  // ============ DELETE CONFIRMATION =============
  function openDeleteDialog(type, id) {
    setDeleteInfo({ type, id });
    setDeleteDialogOpen(true);
  }

  function confirmDelete() {
    setDeleteDialogOpen(false);
    if (!deleteInfo.id || !deleteInfo.type) return;

    if (deleteInfo.type === "branch") {
      handleDeleteBranch(deleteInfo.id);
    } else {
      handleDeleteFacility(deleteInfo.id);
    }
  }

  // ============ RENDER UI ============
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* TOP: Title & Tabs */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h4" gutterBottom>
          Branch & Facility Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ flexWrap: "wrap" }}>
          <Tab icon={<BusinessIcon />} label="Branches" />
          <Tab icon={<BuildCircleIcon />} label="Facilities" />
        </Tabs>
      </Box>

      {/* MAIN PAPER: SEARCH, EXPORT, DATA GRID */}
      <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          {/* SEARCH */}
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearchChange}
            fullWidth
            sx={{ maxWidth: 350 }}
          />

          {/* EXPORT & ADD */}
          <Box sx={{ display: "flex", gap: 1 }}>
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
              <MenuItem onClick={handleExportMenuClose}>
                <CSVLink
                  data={tableRows}
                  headers={csvHeaders}
                  filename={csvFilename}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Export CSV
                </CSVLink>
              </MenuItem>
              <MenuItem onClick={handleExportPDF}>Export PDF</MenuItem>
            </Menu>

            {/* Add button depends on tab */}
            {activeTab === 0 ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ textTransform: "none" }}
                onClick={() => setAddBranchOpen(true)}
              >
                Add Branch
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ textTransform: "none" }}
                onClick={() => setAddFacilityOpen(true)}
              >
                Add Facility
              </Button>
            )}
          </Box>
        </Box>

        {/* DATA GRID */}
        <div style={{ height: 610, width: "100%" }}>
          <DataGrid
            rows={tableRows}
            columns={tableColumns}
            getRowId={(row) => (activeTab === 0 ? row.BranchID : row.FacilityID)}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
            loading={loading}
          />
        </div>
      </Paper>

      {/* --------------------- ADD/EDIT/VIEW DIALOGS: BRANCH --------------------- */}
          {/* ADD Branch Dialog */}
          <Dialog open={isAddBranchOpen} onClose={() => setAddBranchOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              <StoreIcon sx={{ verticalAlign: "middle", mr: 1 }} />
              Add New Branch
            </Typography>
              <IconButton onClick={() => setAddBranchOpen(false)} sx={{ color: "inherit", "&:hover": { color: "red" } }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ p: 2 }}>
              <Divider sx={{ mb: 3 }} />
              <form onSubmit={(e) => e.preventDefault()}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Branch Name */}
                  <TextField
                    label="Branch Name"
                    name="BranchName"
                    fullWidth
                    required
                    value={newBranch.BranchName}
                    onChange={(e) =>
                      setNewBranch((prev) => ({ ...prev, BranchName: e.target.value }))
                    }
                    error={!!branchErrors?.BranchName}
                    helperText={branchErrors?.BranchName}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StoreIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {/* Location */}
                  <TextField
                    label="Location"
                    name="Location"
                    fullWidth
                    required
                    value={newBranch.Location}
                    onChange={(e) =>
                      setNewBranch((prev) => ({ ...prev, Location: e.target.value }))
                    }
                    error={!!branchErrors?.Location}
                    helperText={branchErrors?.Location}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {/* Status */}
                  <FormControl fullWidth required error={!!branchErrors?.Status}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="Status"
                      value={newBranch.Status}
                      onChange={(e) =>
                        setNewBranch((prev) => ({ ...prev, Status: e.target.value }))
                      }
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Closed">Closed</MenuItem>
                    </Select>
                    {branchErrors?.Status && (
                      <Typography color="error" variant="caption">
                        {branchErrors.Status}
                      </Typography>
                    )}
                  </FormControl>
                  {/* Contact */}
                  <TextField
                    label="Contact"
                    name="Contact"
                    fullWidth
                    required
                    value={newBranch.Contact}
                    onChange={(e) =>
                      setNewBranch((prev) => ({ ...prev, Contact: e.target.value }))
                    }
                    error={!!branchErrors?.Contact}
                    helperText={branchErrors?.Contact}  // Change from branchErrors?.Location to branchErrors?.Contact
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                {/* BUTTONS */}
                <Box sx={{ mt: 4, display: "flex", flexDirection: "row", gap: 3, justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBranchOpenConfirmation}
                  disabled={
                    !newBranch.BranchName.trim() ||
                    !newBranch.Location.trim() ||
                    !newBranch.Status ||
                    !newBranch.Contact.trim()
                  }
                  sx={{
                    textTransform: "none",
                    fontWeight: "bold",
                    px: 4,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  <SaveIcon sx={{ mr: 1 }} /> Save Branch
                </Button>
              </Box>

              </form>
            </Box>
          </DialogContent>
        </Dialog>


      {/* CONFIRMATION DIALOG */}
      <Dialog
        open={openBranchConfirmation}
        onClose={() => setOpenBranchConfirmation(false)}
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
          <Typography variant="body1">Are you sure you want to add this branch?</Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", gap: 2, py: 2 }}>
          <Button onClick={() => setOpenBranchConfirmation(false)} sx={{ textTransform: "none" }} style={{ color: "red" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{ textTransform: "none" }}
            onClick={async () => {
              await handleCreateBranch();
              setOpenBranchConfirmation(false);
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>



      {/* View Branch Dialog */}
      <Dialog
        open={isViewBranchOpen}
        onClose={() => setViewBranchOpen(false)}
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
              <BusinessIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Branch Details
              </Typography>
            </Box>
            <IconButton
              onClick={() => setViewBranchOpen(false)}
              sx={{
                "&:hover": { color: theme.palette.error.main },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 4 }}>
          {viewBranch && (
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
                    <BadgeIcon color="primary" /> General Information
                  </Typography>
                  <TextField
                    fullWidth
                    label="Branch ID"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={viewBranch.BranchID || "—"}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Branch Name"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={viewBranch.BranchName || "—"}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Location"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={viewBranch.Location || "—"}
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
                    <BusinessCenterIcon color="primary" /> Contact & Status
                  </Typography>
                  <TextField
                    fullWidth
                    label="Status"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={viewBranch.Status || "—"}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Contact"
                    variant="filled"
                    InputProps={{ readOnly: true }}
                    value={viewBranch.Contact || "—"}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* EDit Branch Dialog */}
{/* EDIT BRANCH */}
<Dialog
  open={isEditBranchOpen}
  onClose={() => setEditBranchOpen(false)}
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
        <EditIcon sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Edit Branch
        </Typography>
      </Box>
      <IconButton
        onClick={() => setEditBranchOpen(false)}
        sx={{
          "&:hover": { color: theme.palette.error.main },
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>
  </DialogTitle>

  <DialogContent dividers sx={{ p: 4 }}>
    {editBranch && (
      <Box sx={{ display: "flex", flexDirection: "row", gap: 4 }}>
        <Grid container spacing={3}>
          {/* LEFT COLUMN: General Information */}
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
              <BadgeIcon color="primary" /> General Information
            </Typography>

            <TextField
              fullWidth
              label="Branch ID"
              variant="filled"
              InputProps={{ readOnly: true }}
              value={editBranch.BranchID || "—"}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Branch Name"
              value={editBranch.BranchName}
              onChange={(e) =>
                setEditBranch((prev) => ({ ...prev, BranchName: e.target.value }))
              }
              error={!!branchErrors?.BranchName}
              helperText={branchErrors?.BranchName}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Location"
              value={editBranch.Location}
              onChange={(e) =>
                setEditBranch((prev) => ({ ...prev, Location: e.target.value }))
              }
              error={!!branchErrors?.Location}
              helperText={branchErrors?.Location}
              sx={{ mb: 2 }}
            />
          </Grid>

          {/* RIGHT COLUMN: Contact & Status */}
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
              <BusinessCenterIcon color="primary" /> Contact & Status
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={editBranch.Status}
                onChange={(e) =>
                  setEditBranch((prev) => ({ ...prev, Status: e.target.value }))
                }
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Contact"
              value={editBranch.Contact}
              onChange={(e) =>
                setEditBranch((prev) => ({ ...prev, Contact: e.target.value }))
              }
              error={!!branchErrors?.Contact}
              helperText={branchErrors?.Contact}
              sx={{ mb: 2 }}
            />
          </Grid>
        </Grid>
      </Box>
    )}
  </DialogContent>

  {/* Dialog Actions - Save aligned to the right */}
  <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
    <Button
      variant="contained"
      color="primary"
      onClick={handleUpdateBranch}
      sx={{
        textTransform: "none",
      }}
    >
      <SaveIcon sx={{ mr: 1 }} /> Save Changes
    </Button>
  </DialogActions>
</Dialog>


      {/* --------------------- ADD/EDIT/VIEW DIALOGS: FACILITY --------------------- */}
      {/* ADD Facility Dialog */}
      <Dialog open={isAddFacilityOpen} onClose={() => setAddFacilityOpen(false)} fullWidth maxWidth="sm">
          {/* DIALOG TITLE */}
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5">
              <BuildCircleIcon sx={{ verticalAlign: "middle", mr: 1 }} />
              Add Facility
              </Typography>
              <IconButton
                onClick={() => setAddFacilityOpen(false)}
                sx={{ color: "inherit", "&:hover": { color: "red" } }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          {/* DIALOG CONTENT */}
          <DialogContent dividers>
            <Box sx={{ p: 2 }}>
              <Divider sx={{ mb: 3 }} />

              <form onSubmit={(e) => e.preventDefault()}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Branch Selection */}
                  <FormControl fullWidth required error={!!facilityErrors?.BranchID}>
                    <InputLabel>Branch</InputLabel>
                    <Select
                      name="BranchID"
                      value={newFacility.BranchID}
                      onChange={(e) =>
                        setNewFacility((prev) => ({ ...prev, BranchID: e.target.value }))
                      }
                    >
                      <MenuItem value="">
                        <em>-- None --</em>
                      </MenuItem>
                      {branches.map((b) => (
                        <MenuItem key={b.BranchID} value={b.BranchID}>
                          {b.BranchName}
                        </MenuItem>
                      ))}
                    </Select>
                    {facilityErrors?.BranchID && (
                      <Typography color="error" variant="caption">
                        {facilityErrors.BranchID}
                      </Typography>
                    )}
                  </FormControl>

                  {/* Facility Name */}
                  <TextField
                    label="Facility Name"
                    name="FacilityName"
                    fullWidth
                    required
                    value={newFacility.FacilityName}
                    onChange={(e) =>
                      setNewFacility((prev) => ({
                        ...prev,
                        FacilityName: e.target.value,
                      }))
                    }
                    error={!!facilityErrors?.FacilityName}
                    helperText={facilityErrors?.FacilityName}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FitnessCenterIcon />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Description */}
                  <TextField
                    label="Description"
                    name="Description"
                    fullWidth
                    required
                    multiline
                    rows={2}
                    value={newFacility.Description}
                    onChange={(e) =>
                      setNewFacility((prev) => ({
                        ...prev,
                        Description: e.target.value,
                      }))
                    }
                    error={!!facilityErrors?.Description}
                    helperText={facilityErrors?.Description}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <StickyNote2Icon />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Status Selection */}
                  <FormControl fullWidth required error={!!facilityErrors?.Status}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="Status"
                      value={newFacility.Status}
                      onChange={(e) =>
                        setNewFacility((prev) => ({
                          ...prev,
                          Status: e.target.value,
                        }))
                      }
                    >
                      <MenuItem value="Available">Available</MenuItem>
                      <MenuItem value="Under Maintenance">Under Maintenance</MenuItem>
                      <MenuItem value="Closed">Closed</MenuItem>
                    </Select>
                    {facilityErrors?.Status && (
                      <Typography color="error" variant="caption">
                        {facilityErrors.Status}
                      </Typography>
                    )}
                  </FormControl>
                </Box>

                {/* BUTTONS */}
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
                    onClick={handleFacilityOpenConfirmation}
                    disabled={
                      !newFacility.BranchID ||
                      !newFacility.FacilityName.trim() ||
                      !newFacility.Description.trim() ||
                      !newFacility.Status
                    }
                    sx={{ textTransform: "none" }}
                  >
                    <SaveIcon sx={{ mr: 1 }} /> Save Facility
                  </Button>
                </Box>

              </form>
            </Box>
          </DialogContent>
        </Dialog>


        {/* CONFIRMATION DIALOG */}
        <Dialog
          open={openFacilityConfirmation}
          onClose={() => setOpenFacilityConfirmation(false)}
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
            <Typography variant="body1">Are you sure you want to add this facility?</Typography>
          </DialogContent>

          <DialogActions sx={{ justifyContent: "center", gap: 2, py: 2 }}>
            <Button onClick={() => setOpenFacilityConfirmation(false)} sx={{ textTransform: "none" }} style={{ color: "red" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              sx={{ textTransform: "none" }}
              onClick={async () => {
                await handleCreateFacility();
                setOpenFacilityConfirmation(false);
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>


     {/* EDIT FACILITY */}
      <Dialog
        open={isEditFacilityOpen}
        onClose={() => setEditFacilityOpen(false)}
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
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BuildCircleIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Edit Facility
              </Typography>
            </Box>
            <IconButton
              onClick={() => setEditFacilityOpen(false)}
              sx={{
                "&:hover": { color: theme.palette.error.main },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 4 }}>
          {editFacility && (
            <>
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Branch</InputLabel>
                <Select
                  value={editFacility.BranchID || ""}
                  onChange={(e) =>
                    setEditFacility((prev) => ({ ...prev, BranchID: e.target.value }))
                  }
                >
                  <MenuItem value="">
                    <em>-- None --</em>
                  </MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.BranchID} value={b.BranchID}>
                      {b.BranchName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Facility Name"
                fullWidth
                margin="normal"
                size="small"
                value={editFacility.FacilityName || ""}
                onChange={(e) =>
                  setEditFacility((prev) => ({
                    ...prev,
                    FacilityName: e.target.value,
                  }))
                }
              />

              <TextField
                label="Description"
                fullWidth
                margin="normal"
                size="small"
                multiline
                rows={2}
                value={editFacility.Description || ""}
                onChange={(e) =>
                  setEditFacility((prev) => ({
                    ...prev,
                    Description: e.target.value,
                  }))
                }
              />

              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={editFacility.Status || "Available"}
                  onChange={(e) =>
                    setEditFacility((prev) => ({
                      ...prev,
                      Status: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="Available">Available</MenuItem>
                  <MenuItem value="Under Maintenance">Under Maintenance</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>

        {/* Dialog Actions - Save aligned to the right */}
        <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateFacility}
            sx={{
              textTransform: "none",
            }}
          >
            <SaveIcon sx={{ mr: 1 }} /> Save Changes
          </Button>
        </DialogActions>
      </Dialog>

    {/* VIEW FACILITY */}
      <Dialog
        open={isViewFacilityOpen}
        onClose={() => setViewFacilityOpen(false)}
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
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FitnessCenterIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Facility Details
              </Typography>
            </Box>
            <IconButton
              onClick={() => setViewFacilityOpen(false)}
              sx={{
                "&:hover": { color: theme.palette.error.main },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 4 }}>
          {viewFacility && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                <BadgeIcon color="primary" /> General Information
              </Typography>

              <TextField
                fullWidth
                label="Facility ID"
                variant="filled"
                InputProps={{ readOnly: true }}
                value={viewFacility.FacilityID ?? "—"}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Facility Name"
                variant="filled"
                InputProps={{ readOnly: true }}
                value={viewFacility.FacilityName ?? "—"}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Description"
                variant="filled"
                multiline
                rows={3}
                InputProps={{ readOnly: true }}
                value={viewFacility.Description ?? "—"}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Status"
                variant="filled"
                InputProps={{ readOnly: true }}
                value={viewFacility.Status ?? "—"}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Branch"
                variant="filled"
                InputProps={{ readOnly: true }}
                value={viewFacility.branch ? viewFacility.branch.BranchName : "—"}
                sx={{ mb: 2 }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* --------------------- DELETE CONFIRMATION DIALOG --------------------- */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
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
    </Box>
  );
}
