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
  IconButton,
  Tooltip,
  Divider,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useTheme } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import WarningIcon from "@mui/icons-material/Warning";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";

export default function ManagePlansModal({ onClose }) {
  const theme = useTheme();

  // Data and loading state
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states for add/edit and delete confirmation
  const [isPlanDialogOpen, setPlanDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // Save confirmation state for add/edit
  const [isSaveConfirmOpen, setSaveConfirmOpen] = useState(false);

  // For add/edit: if editing, planForm.PlanID will be set
  const [planForm, setPlanForm] = useState({
    PlanID: null,
    PlanName: "",
    Price: 0,
    Duration: "",
    Features: "",
  });
  // For deletion: store the plan ID to delete
  const [planToDelete, setPlanToDelete] = useState(null);
  // Form errors for UI validation
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/membership/plans");
      setPlans(res.data || []);
    } catch (err) {
      console.error("Error fetching plans:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter plans based on search term
  const filteredPlans = plans.filter((plan) =>
    Object.values(plan)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Open add/edit dialog (make sure fields have safe defaults)
  const openPlanDialog = (plan = null) => {
    if (plan) {
      setPlanForm({
        PlanID: plan.PlanID ?? null,
        PlanName: plan.PlanName ?? "",
        Price: plan.Price ?? 0,
        Duration: plan.Duration ?? "",
        Features: plan.Features ?? "",
      });
    } else {
      // Creating a brand-new plan
      setPlanForm({
        PlanID: null,
        PlanName: "",
        Price: 0,
        Duration: "",
        Features: "",
      });
    }
    setFormErrors({});
    setPlanDialogOpen(true);
  };

  const closePlanDialog = () => {
    setPlanDialogOpen(false);
    setFormErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setPlanForm((prev) => ({ ...prev, [name]: value }));
    // Remove error for that field as the user types
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Validate required fields before showing confirmation
  const validatePlanForm = () => {
    let errors = {};
    if (!planForm.PlanName.trim()) {
      errors.PlanName = "Plan Name is required";
    }
    // You can add more validations here if needed.
    return errors;
  };

  // Open the save confirmation dialog only if validation passes
  const handleOpenSaveConfirm = () => {
    const errors = validatePlanForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSaveConfirmOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      if (planForm.PlanID) {
        // Update existing plan
        const res = await axios.put(`/membership/plans/${planForm.PlanID}`, {
          PlanName: planForm.PlanName,
          Price: parseFloat(planForm.Price) || 0,
          Duration: planForm.Duration,
          Features: planForm.Features,
        });
        setPlans((prev) =>
          prev.map((p) => (p.PlanID === planForm.PlanID ? res.data : p))
        );
      } else {
        // Create new plan
        const res = await axios.post("/membership/plans", {
          PlanName: planForm.PlanName,
          Price: parseFloat(planForm.Price) || 0,
          Duration: planForm.Duration,
          Features: planForm.Features,
        });
        setPlans((prev) => [...prev, res.data]);
      }
      closePlanDialog();
    } catch (err) {
      console.error("Error saving plan:", err);
    }
  };

  // Triggered from the confirmation dialog
  const confirmSavePlan = async () => {
    setSaveConfirmOpen(false);
    await handleSavePlan();
  };

  // Open delete confirmation dialog
  const openDeleteConfirm = (planId) => {
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const handleDeletePlan = async () => {
    setDeleteDialogOpen(false);
    try {
      await axios.delete(`/membership/plans/${planToDelete}`);
      setPlans((prev) => prev.filter((p) => p.PlanID !== planToDelete));
      setPlanToDelete(null);
    } catch (err) {
      console.error("Error deleting plan:", err);
    }
  };

  // DataGrid column definitions
  const columns = [
    {
      field: "PlanID",
      headerName: "ID",
      width: 80,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "PlanName",
      headerName: "Plan Name",
      width: 200,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Price",
      headerName: "Price",
      width: 100,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Duration",
      headerName: "Duration",
      width: 120,
      renderCell: (params) => params.value ?? "—",
    },
    {
      field: "Features",
      headerName: "Features",
      width: 200,
      renderCell: (params) => params.value || "—",
    },
    {
      field: "Actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Edit Plan">
            <IconButton
              color="primary"
              onClick={() => openPlanDialog(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Plan">
            <IconButton
              color="error"
              onClick={() => openDeleteConfirm(params.row.PlanID)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
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
        <Typography variant="h5">
          <PersonIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          Manage Membership Plans
        </Typography>
        <IconButton onClick={onClose} sx={{ "&:hover": { color: "red" } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Top bar with search and add plan */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search..."
            value={searchTerm}
            fullWidth
            sx={{ maxWidth: 350 }}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => openPlanDialog()}
            sx={{ textTransform: "none" }}
          >
            ADD PLAN
          </Button>
        </Box>
        {/* Data grid */}
        <Paper elevation={2} sx={{ height: 450, width: "100%" }}>
          <DataGrid
            rows={filteredPlans}
            columns={columns}
            getRowId={(row) => row.PlanID}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
            loading={loading}
            disableSelectionOnClick
          />
        </Paper>
      </DialogContent>
      {/* Add/Edit Plan Dialog */}
      <Dialog
        open={isPlanDialogOpen}
        onClose={closePlanDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              {planForm.PlanID ? "Edit Plan" : "Add New Plan"}
            </Typography>
            <IconButton
              onClick={closePlanDialog}
              sx={{ "&:hover": { color: "red" } }}
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
                {/* Plan Name */}
                <TextField
                  label="Plan Name"
                  name="PlanName"
                  fullWidth
                  required
                  value={planForm.PlanName}
                  onChange={handleFormChange}
                  variant="outlined"
                  error={!!formErrors.PlanName}
                  helperText={formErrors.PlanName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AssignmentIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                {/* Price */}
                <TextField
                  label="Price"
                  name="Price"
                  type="number"
                  fullWidth
                  required
                  value={planForm.Price}
                  onChange={handleFormChange}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ fontWeight: "bold" }}>₱</Typography>
                      </InputAdornment>
                    ),
                  }}
                />
                {/* Duration */}
                <TextField
                  label="Duration (In Days)"
                  name="Duration"
                  fullWidth
                  required
                  value={planForm.Duration}
                  onChange={handleFormChange}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccessTimeIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                {/* Features */}
                <TextField
                  label="Features"
                  name="Features"
                  fullWidth
                  multiline
                  rows={2}
                  value={planForm.Features}
                  onChange={handleFormChange}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <StickyNote2Icon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </form>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-end", gap: 2, p: 3 }}>
          <Button
            variant="contained"
            onClick={handleOpenSaveConfirm}
            disabled={
              !planForm.PlanName.trim() ||
              !planForm.Price ||
              isNaN(planForm.Price) ||
              Number(planForm.Price) <= 0 ||
              !planForm.Duration ||
              isNaN(planForm.Duration) ||
              Number(planForm.Duration) <= 0 ||
              !planForm.Features.trim()
            }
            startIcon={<SaveIcon />}
            sx={{ textTransform: "none" }}
          >
            {planForm.PlanID ? "Save Changes" : "ADD PLAN"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Save Confirmation Dialog */}
      <Dialog
        open={isSaveConfirmOpen}
        onClose={() => setSaveConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: "bold" }}
        >
          <WarningIcon color="warning" />
          Confirm Save
        </DialogTitle>
        <DialogContent dividers>
          <Typography>Are you sure you want to save this plan?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={confirmSavePlan}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: "bold" }}
        >
          <DeleteForeverIcon color="error" />
          Confirm Deletion
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete this plan? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeletePlan}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
