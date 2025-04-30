import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Autocomplete,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

// Gradients for each status
const statusGradients = {
  Available: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
  Occupied: "linear-gradient(135deg, #f44336 0%, #ef5350 100%)",
  OutOfService: "linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)",
};

// Styled card with hover scale/shadow
const LockerCard = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  overflow: "hidden",
  color: "#fff",
  padding: theme.spacing(2),
  textAlign: "center",
  height: "100%",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: theme.shadows[4],
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "scale(1.03)",
    boxShadow: theme.shadows[8],
  },
}));

export default function LockerManagement() {
  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const clockString = currentTime.toLocaleTimeString();

  // Lockers & Branches
  const [lockers, setLockers] = useState([]);
  const [branches, setBranches] = useState([]);

  // Fetch on mount
  useEffect(() => {
    axios
      .get("/operations/lockers")
      .then((res) => setLockers(res.data.lockers || []))
      .catch((err) => console.error("Error fetching lockers:", err));

    axios
      .get("/owner/branches")
      .then((res) => setBranches(res.data.branches || []))
      .catch((err) => console.error("Error fetching branches:", err));
  }, []);

  // Branch filter
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [adminInfo, setAdminInfo] = useState(null);
  
  // Fetch admin info when component mounts
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        // Use the correct endpoint for admin
        const response = await axios.get('/admin/get-logged-in-admin');
        setAdminInfo(response.data);
        
        // If admin has a branch ID, set it as the branch filter
        if (response.data && response.data.BranchID) {
          setSelectedBranch(String(response.data.BranchID));
        }
      } catch (error) {
        console.error('Failed to fetch admin info:', error);
      }
    };
    
    fetchAdminInfo();
  }, []);
  
  const filteredLockers =
    selectedBranch === "All Branches"
      ? lockers
      : lockers.filter((lk) => String(lk.BranchID) === String(selectedBranch));

  // Add Locker
  const [isAddLockerOpen, setAddLockerOpen] = useState(false);
  const [newLockerNumber, setNewLockerNumber] = useState("");
  const [newLockerBranch, setNewLockerBranch] = useState("");
  const [addError, setAddError] = useState("");

  const handleAddLockerOpen = () => {
    setNewLockerNumber("");
    setNewLockerBranch("");
    setAddError("");
    setAddLockerOpen(true);
  };

  const handleAddLocker = () => {
    const numVal = parseInt(newLockerNumber, 10);
    if (!numVal || numVal <= 0) {
      setAddError("Please enter a valid locker number.");
      return;
    }
    const payload = {
      LockerNumber: String(numVal),
      Status: "Available",
      Notes: null,
      BranchID: newLockerBranch || null,
    };
    axios
      .post("/operations/lockers", payload)
      .then(() => axios.get("/operations/lockers"))
      .then((res) => {
        setLockers(res.data.lockers || []);
        setAddLockerOpen(false);
      })
      .catch((err) => {
        console.error(err);
        if (err.response?.data?.message) {
          setAddError(err.response.data.message);
        } else if (err.response?.data?.error) {
          setAddError(err.response.data.error);
        }
      });
  };

  // Borrow
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [borrowData, setBorrowData] = useState({
    LockerID: "",
    MemberID: "",
    Notes: "",
  });
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOptions, setMemberOptions] = useState([]);

  // Member search
  useEffect(() => {
    if (memberSearch.trim().length > 0) {
      axios
        .get(`/membership/members/search?q=${memberSearch.trim()}`)
        .then((res) => setMemberOptions(res.data))
        .catch((err) => console.error("Error searching members:", err));
    } else {
      setMemberOptions([]);
    }
  }, [memberSearch]);

  const openBorrowForm = (lockerItem) => {
    setBorrowData({
      LockerID: lockerItem.LockerID,
      MemberID: "",
      Notes: "",
    });
    setMemberSearch("");
    setMemberOptions([]);
    setBorrowOpen(true);
  };

  const handleBorrowChange = (e) => {
    setBorrowData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBorrowSubmit = () => {
    if (!borrowData.LockerID || !borrowData.MemberID) {
      alert("LockerID and MemberID are required.");
      return;
    }
    axios
      .post("/operations/lockers/borrow", borrowData)
      .then(() => axios.get("/operations/lockers"))
      .then((res) => {
        setLockers(res.data.lockers || []);
        setBorrowOpen(false);
      })
      .catch((err) => console.error("Error borrowing locker:", err));
  };

  // Return
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnData, setReturnData] = useState({
    usageId: "",
    returnDate: "",
    notes: "",
    occupantName: "",
  });

  const openReturnForm = (usageId, occupantName = "") => {
    setReturnData({
      usageId: usageId || "",
      returnDate: "",
      notes: "",
      occupantName: occupantName || "",
    });
    setReturnOpen(true);
  };

  const handleReturnChange = (e) => {
    setReturnData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleReturnSubmit = () => {
    if (!returnData.usageId) {
      alert("Missing usage ID.");
      return;
    }
    axios
      .post(`/operations/lockers/${returnData.usageId}/return`, {
        notes: returnData.notes,
        returnDate: returnData.returnDate,
      })
      .then(() => axios.get("/operations/lockers"))
      .then((res) => {
        setLockers(res.data.lockers || []);
        setReturnOpen(false);
      })
      .catch((err) => console.error("Error returning locker:", err));
  };

  // Remove Locker
  const removeLocker = (lockerID) => {
    if (!confirm("Remove this locker?")) return;
    axios
      .delete(`/operations/lockers/${lockerID}`)
      .then(() => axios.get("/operations/lockers"))
      .then((res) => setLockers(res.data.lockers || []))
      .catch((err) => console.error("Error removing locker:", err));
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Clock */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: "#424242",
          color: "#fff",
          textAlign: "center",
          borderRadius: 2,
        }}
        elevation={4}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          {clockString}
        </Typography>
      </Paper>

      {/* Branch Filter */}
      <FormControl sx={{ mb: 2, minWidth: 180 }}>
        <InputLabel>Filter by Branch</InputLabel>
        <Select
          label="Filter by Branch"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <MenuItem value="All Branches">All Branches</MenuItem>
          {branches.map((branch) => (
            <MenuItem key={branch.BranchID} value={branch.BranchID}>
              {branch.BranchName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Locker Management
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleAddLockerOpen}
        sx={{ mb: 3 }}
      >
        Add Locker
      </Button>

      {/* Set columns={5} to ensure 5 lockers per row */}
      <Grid container spacing={3} columns={5}>
        {filteredLockers
          .slice()
          .sort(
            (a, b) =>
              parseInt(a.LockerNumber, 10) - parseInt(b.LockerNumber, 10)
          )
          .map((locker) => {
            const gradient =
              statusGradients[locker.Status] || statusGradients.OutOfService;

            return (
              // Each item takes up 1 column out of 5
              <Grid item xs={1} key={locker.LockerID}>
                <LockerCard
                  sx={{ background: gradient }}
                  onClick={() => {
                    if (locker.Status === "Available") {
                      openBorrowForm(locker);
                    } else if (locker.Status === "Occupied") {
                      const usageId = locker.occupant?.UsageID || "";
                      const occupantName = locker.occupant?.FullName || "";
                      openReturnForm(usageId, occupantName);
                    }
                  }}
                >
                  <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                      Locker #{locker.LockerNumber}
                    </Typography>
                    <Typography variant="body1">{locker.Status}</Typography>

                    {locker.Status === "Occupied" && locker.occupant && (
                      <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Occupied by: {locker.occupant.FullName}
                      </Typography>
                    )}

                    <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                      Branch: {locker.BranchID}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 1, textAlign: "right" }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLocker(locker.LockerID);
                      }}
                      sx={{ color: "#fff" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </LockerCard>
              </Grid>
            );
          })}
      </Grid>

      {/* Add Locker Dialog */}
      <Dialog
        open={isAddLockerOpen}
        onClose={() => setAddLockerOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add New Locker</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Locker Number"
            fullWidth
            margin="normal"
            value={newLockerNumber}
            onChange={(e) => setNewLockerNumber(e.target.value)}
            error={!!addError}
            helperText={addError}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Branch</InputLabel>
            <Select
              label="Select Branch"
              value={newLockerBranch}
              onChange={(e) => setNewLockerBranch(e.target.value)}
            >
              <MenuItem value="">No Branch</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.BranchID} value={branch.BranchID}>
                  {branch.BranchName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddLockerOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddLocker}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Borrow Locker Dialog */}
      <Dialog
        open={borrowOpen}
        onClose={() => setBorrowOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Locker Borrow Form</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Locker ID"
            name="LockerID"
            margin="normal"
            fullWidth
            value={borrowData.LockerID}
            onChange={handleBorrowChange}
            disabled
          />

          <Autocomplete
            freeSolo={false}
            options={memberOptions}
            getOptionLabel={(option) => option.FullName}
            onInputChange={(event, newInputValue) => {
              setMemberSearch(newInputValue);
            }}
            onChange={(event, newValue) => {
              setBorrowData((prev) => ({
                ...prev,
                MemberID: newValue ? newValue.MemberID : "",
              }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Member"
                margin="normal"
                fullWidth
              />
            )}
          />

          <TextField
            label="Notes"
            name="Notes"
            margin="normal"
            fullWidth
            multiline
            rows={2}
            value={borrowData.Notes}
            onChange={handleBorrowChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBorrowOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBorrowSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Locker Dialog */}
      <Dialog
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Locker Return Form</DialogTitle>
        <DialogContent dividers>
          {returnData.occupantName && (
            <Typography sx={{ mb: 2 }}>
              Occupied by: {returnData.occupantName}
            </Typography>
          )}
          <TextField
            label="Usage ID"
            name="usageId"
            margin="normal"
            fullWidth
            value={returnData.usageId}
            onChange={handleReturnChange}
          />
          <TextField
            label="Return Date"
            name="returnDate"
            type="date"
            margin="normal"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={returnData.returnDate}
            onChange={handleReturnChange}
          />
          <TextField
            label="Notes"
            name="notes"
            margin="normal"
            fullWidth
            multiline
            rows={3}
            value={returnData.notes}
            onChange={handleReturnChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleReturnSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
