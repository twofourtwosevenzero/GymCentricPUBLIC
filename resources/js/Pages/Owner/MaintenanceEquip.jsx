import React, { useState, useEffect } from "react";
import {
  Box,
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
  Chip,
  Tooltip,
  Pagination,
  Snackbar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
// Replace react-beautiful-dnd with @hello-pangea/dnd to avoid the defaultProps warning.
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import BuildIcon from "@mui/icons-material/Build";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { grey } from "@mui/material/colors";

// Global reorder function (for reordering an array)
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// Colors for droppable columns (light mode)
const droppableBackground = {
  availableList: "#c8e6c9",
  maintenanceList: "#fff9c4",
  outServiceList: "#ffccbc",
};

export default function MaintenanceEquip() {
  const theme = useTheme();
  const itemsPerPage = 5;

  // 1) Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const clockString = currentTime.toLocaleTimeString();

  // 2) Branches
  const [branches, setBranches] = useState([]);
  useEffect(() => {
    fetch("/owner/branches")
      .then((res) => res.json())
      .then((data) => setBranches(data.branches || []))
      .catch((err) => console.error("Error fetching branches:", err));
  }, []);

  // 3) Equipment
  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");

  const [equipment, setEquipment] = useState([]);
  const getEquipment = () => {
    fetch("/operations/equipment", {
      method: "GET",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((res) => res.json())
      .then((data) =>
        setEquipment(data.equipment || data.props?.equipment || [])
      )
      .catch((err) => console.error("Error fetching equipment:", err));
  };

  useEffect(() => {
    getEquipment();
  }, []);

  // 4) Maintenance Logs
  const [logs, setLogs] = useState([]);
  const getLogs = () => {
    fetch("/operations/maintenance-logs")
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch((err) => console.error("Error fetching maintenance logs:", err));
  };

  useEffect(() => {
    getLogs();
  }, []);

  // 5) Branch Filter
  const [selectedBranch, setSelectedBranch] = useState("All");
  const filteredEquipment =
    selectedBranch === "All"
      ? equipment
      : equipment.filter(
          (eq) => String(eq.BranchID) === String(selectedBranch)
        );

  // Split equipment into status columns
  const availableEquip = filteredEquipment.filter(
    (eq) => eq.Status === "Available"
  );
  const maintenanceEquip = filteredEquipment.filter(
    (eq) => eq.Status === "InMaintenance"
  );
  const outOfServiceEquip = filteredEquipment.filter(
    (eq) => eq.Status === "OutOfService"
  );

  // 6) Pagination States & Derived Data
  const [availablePage, setAvailablePage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [outOfServicePage, setOutOfServicePage] = useState(1);

  const availableTotalPages = Math.ceil(availableEquip.length / itemsPerPage) || 1;
  const maintenanceTotalPages =
    Math.ceil(maintenanceEquip.length / itemsPerPage) || 1;
  const outOfServiceTotalPages =
    Math.ceil(outOfServiceEquip.length / itemsPerPage) || 1;

  const availableEquipPageItems = availableEquip.slice(
    (availablePage - 1) * itemsPerPage,
    availablePage * itemsPerPage
  );
  const maintenanceEquipPageItems = maintenanceEquip.slice(
    (maintenancePage - 1) * itemsPerPage,
    maintenancePage * itemsPerPage
  );
  const outOfServiceEquipPageItems = outOfServiceEquip.slice(
    (outOfServicePage - 1) * itemsPerPage,
    outOfServicePage * itemsPerPage
  );

  // 7) Add Equipment
  const [isAddOpen, setAddOpen] = useState(false);
  const [newEquipData, setNewEquipData] = useState({
    Name: "",
    SerialNumber: "",
    BranchID: "",
  });
  const [addError, setAddError] = useState("");

  const handleAddOpen = () => {
    setNewEquipData({ Name: "", SerialNumber: "", BranchID: "" });
    setAddError("");
    setAddOpen(true);
  };

  const handleAddEquipChange = (e) => {
    const { name, value } = e.target;
    setNewEquipData((prev) => ({ ...prev, [name]: value }));
  };

  const refetchEquipment = () => {
    fetch("/operations/equipment")
      .then((res) => res.json())
      .then((data) =>
        setEquipment(data.equipment || data.props?.equipment || [])
      )
      .catch((err) => console.error("Error refetching equipment:", err));
  };

  const handleAddEquipSubmit = () => {
    if (!newEquipData.Name || !newEquipData.SerialNumber) {
      setAddError("Please fill out required fields (Name, SerialNumber).");
      return;
    }
    const payload = {
      Name: newEquipData.Name,
      SerialNumber: newEquipData.SerialNumber,
      Status: "Available",
      BranchID: newEquipData.BranchID || null,
    };

    fetch("/operations/equipment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not save equipment.");
        return res;
      })
      .then(() => {
        refetchEquipment();
        setAddOpen(false);
      })
      .catch((err) => {
        console.error(err);
        setAddError("Error saving new equipment.");
      });
  };

  // 8) Drag & Drop with Pagination Adjustment
  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    // If reordering within the same droppable column
    let updatedList = [];
    if (source.droppableId === destination.droppableId) {
      let offset = 0;
      if (source.droppableId === "availableList")
        offset = (availablePage - 1) * itemsPerPage;
      if (source.droppableId === "maintenanceList")
        offset = (maintenancePage - 1) * itemsPerPage;
      if (source.droppableId === "outServiceList")
        offset = (outOfServicePage - 1) * itemsPerPage;

      if (source.droppableId === "availableList") {
        updatedList = reorder(
          availableEquip,
          source.index + offset,
          destination.index + offset
        );
        applyReorderToEquipment(updatedList, "Available");
      } else if (source.droppableId === "maintenanceList") {
        updatedList = reorder(
          maintenanceEquip,
          source.index + offset,
          destination.index + offset
        );
        applyReorderToEquipment(updatedList, "InMaintenance");
      } else if (source.droppableId === "outServiceList") {
        updatedList = reorder(
          outOfServiceEquip,
          source.index + offset,
          destination.index + offset
        );
        applyReorderToEquipment(updatedList, "OutOfService");
      }
      return;
    }
    // If moving across columns, handle the status change
    if (source.droppableId !== destination.droppableId) {
      handleChangeStatus(source, destination);
    }
  };

  const applyReorderToEquipment = (newArr, status) => {
    const others = equipment.filter((eq) => eq.Status !== status);
    const final = [
      ...others,
      ...newArr.map((item) => ({ ...item, Status: status })),
    ];
    setEquipment(final);
  };

  const getListFromDroppable = (droppableId) => {
    if (droppableId === "availableList") return availableEquip;
    if (droppableId === "maintenanceList") return maintenanceEquip;
    return outOfServiceEquip;
  };

  // 9) Status-Change Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    EquipmentID: null,
    oldStatus: "",
    newStatus: "",
    reason: "",
    date: "",
    time: "",
  });
  const [modalEquipItem, setModalEquipItem] = useState(null);

  const handleChangeStatus = (source, destination) => {
    const srcList = getListFromDroppable(source.droppableId);
    let offset = 0;
    if (source.droppableId === "availableList")
      offset = (availablePage - 1) * itemsPerPage;
    if (source.droppableId === "maintenanceList")
      offset = (maintenancePage - 1) * itemsPerPage;
    if (source.droppableId === "outServiceList")
      offset = (outOfServicePage - 1) * itemsPerPage;

    const [movedItem] = srcList.splice(source.index + offset, 1);
    let newStatus = "Available";
    if (destination.droppableId === "maintenanceList")
      newStatus = "InMaintenance";
    if (destination.droppableId === "outServiceList")
      newStatus = "OutOfService";

    setModalEquipItem(movedItem);
    setModalData({
      EquipmentID: movedItem.EquipmentID,
      oldStatus: movedItem.Status,
      newStatus,
      reason: "",
      date: "",
      time: "",
    });
    setModalOpen(true);
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModalCancel = () => {
    setModalOpen(false);
  };

  const handleModalSave = () => {
    const { EquipmentID, oldStatus, newStatus, reason, date, time } = modalData;
    if (!EquipmentID || !date || !time) {
      alert("Please specify date/time for the status change.");
      return;
    }
    const eq = modalEquipItem || {};
    const updatePayload = {
      EquipmentID: eq.EquipmentID,
      Name: eq.Name,
      SerialNumber: eq.SerialNumber,
      Status: newStatus,
      BranchID: eq.BranchID,
    };

    fetch("/operations/equipment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(updatePayload),
    })
      .then((res) => {
        if (!res.ok)
          throw new Error("Failed to update equipment status.");
        return res;
      })
      .then(() => {
        if (newStatus === "InMaintenance" || newStatus === "OutOfService") {
          const logPayload = {
            EquipmentID: eq.EquipmentID,
            MaintenanceDate: date,
            IssueDescription: reason,
            Resolution: "",
            MaintainedBy: null,
            NextMaintenanceDate: null,
            Notes: `Status changed from ${oldStatus} to ${newStatus} at ${time}.`,
          };
          return fetch("/operations/maintenance-logs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-TOKEN": csrfToken,
              "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify(logPayload),
          });
        }
      })
      .then(() => {
        setEquipment((prev) =>
          prev.map((item) =>
            item.EquipmentID === EquipmentID
              ? { ...item, Status: newStatus }
              : item
          )
        );
        getLogs();
        setModalOpen(false);
      })
      .catch((err) => {
        console.error(err);
        alert("Error updating status or adding maintenance log.");
      });
  };

  // 10) Delete Confirmation & Removal
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");

  const handleDeleteClick = (equipmentID) => {
    setEquipmentToDelete(equipmentID);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    setEquipment((prev) =>
      prev.filter((eq) => eq.EquipmentID !== equipmentToDelete)
    );
    setDeleteDialogOpen(false);
    setSnackMessage("Equipment deleted successfully.");
    setSnackOpen(true);
  };

  // 11) Activity Logs
  const [editLogIndex, setEditLogIndex] = useState(null);
  const [editLogText, setEditLogText] = useState("");

  const handleEditLog = (logItem, idx) => {
    setEditLogIndex(idx);
    const combined = `Issue: ${logItem.IssueDescription}\nResolution: ${logItem.Resolution}\nNotes: ${logItem.Notes}`;
    setEditLogText(combined);
  };

  const handleSaveLogEdit = () => {
    if (editLogIndex == null) return;
    const logToEdit = logs[editLogIndex];
    if (!logToEdit) {
      setEditLogIndex(null);
      return;
    }
    const updatedLog = { ...logToEdit, Notes: editLogText };

    fetch(`/operations/maintenance-logs/${logToEdit.MaintenanceID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(updatedLog),
    })
      .then((res) => {
        if (!res.ok)
          throw new Error("Failed to update maintenance log.");
        return res.json();
      })
      .then(() => {
        getLogs();
        setEditLogIndex(null);
        setEditLogText("");
      })
      .catch((err) => console.error(err));
  };

  const handleCancelLogEdit = () => {
    setEditLogIndex(null);
    setEditLogText("");
  };

  const deleteLog = (logId) => {
    if (!window.confirm("Are you sure you want to delete this log entry?"))
      return;
    fetch(`/operations/maintenance-logs/${logId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error deleting log.");
        getLogs();
      })
      .catch((err) => console.error(err));
  };

  const clearAllLogs = () => {
    if (!window.confirm("Really delete all logs?")) return;
    const promises = logs.map((log) =>
      fetch(`/operations/maintenance-logs/${log.MaintenanceID}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
      })
    );
    Promise.all(promises)
      .then(() => getLogs())
      .catch((err) => console.error("Failed clearing all logs:", err));
  };

  const truncatedLogs = logs.slice(0, 15);

  // 12) Styles and Render Functions
  const getListStyle = (droppableId, isDraggingOver, theme) => ({
    background: isDraggingOver
      ? theme.palette.action.hover
      : theme.palette.mode === "dark"
      ? "#424242"
      : droppableBackground[droppableId] || "#f5f5f5",
    padding: 8,
    width: 350,
    height: 380,
    borderRadius: 4,
    transition: "background 0.2s",
  });

  const statusChips = {
    Available: (
      <Chip
        size="small"
        label="Available"
        icon={<CheckBoxOutlineBlankIcon style={{ fontSize: 16 }} />}
        color="success"
        sx={{ fontSize: "0.7rem" }}
      />
    ),
    InMaintenance: (
      <Chip
        size="small"
        label="Maintenance"
        icon={<BuildCircleIcon style={{ fontSize: 16 }} />}
        color="warning"
        sx={{ fontSize: "0.7rem" }}
      />
    ),
    OutOfService: (
      <Chip
        size="small"
        label="Out of Service"
        icon={<ErrorOutlineIcon style={{ fontSize: 16 }} />}
        color="error"
        sx={{ fontSize: "0.7rem" }}
      />
    ),
  };

  const renderDraggableItem = (item, index) => {
    const isDark = theme.palette.mode === "dark";
    return (
      <Draggable
        key={String(item.EquipmentID)}
        draggableId={String(item.EquipmentID)}
        index={index}
      >
        {(provided, snapshot) => (
          <Paper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            elevation={snapshot.isDragging ? 4 : 1}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              width: "100%",
              backgroundColor: isDark
                ? theme.palette.background.paper
                : "white",
              transition: "box-shadow 0.2s",
              cursor: "grab",
              position: "relative",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              {statusChips[item.Status]}
              <IconButton
                size="small"
                onClick={() => handleDeleteClick(item.EquipmentID)}
                sx={{
                  color: isDark ? "grey.300" : "grey.600",
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                mb: 0.5,
                color: isDark ? "grey.100" : "grey.900",
              }}
            >
              {item.Name}
            </Typography>
            <Typography
              variant="body2"
              color={isDark ? "grey.400" : "text.secondary"}
            >
              SN: {item.SerialNumber}
            </Typography>
            <Typography
              variant="body2"
              color={isDark ? "grey.400" : "text.secondary"}
            >
              Branch: {item.BranchID}
            </Typography>
          </Paper>
        )}
      </Draggable>
    );
  };

  // 13) Final Return
  return (
    <Box sx={{ display: "flex", gap: 3, p: 4, flexWrap: "wrap" }}>
      {/* Left: Equipment Drag & Drop */}
      <Box flex={1} minWidth={600}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Equipment Management
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Filter by Branch</InputLabel>
            <Select
              label="Filter by Branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <MenuItem value="All">All Branches</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b.BranchID} value={String(b.BranchID)}>
                  {b.BranchName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddOpen}
          >
            Add Equipment
          </Button>
        </Box>

        <DragDropContext onDragEnd={onDragEnd}>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {/* Available */}
            <Box>
              <Droppable droppableId="availableList">
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ p: 2 }}
                    style={getListStyle(
                      "availableList",
                      snapshot.isDraggingOver,
                      theme
                    )}
                  >
                    <Typography variant="h6" gutterBottom textAlign="center">
                      <CheckBoxOutlineBlankIcon sx={{ mr: 1 }} />
                      Available
                    </Typography>
                    <Box
                      sx={{
                        height: "calc(100% - 60px)",
                        overflowY: "auto",
                      }}
                    >
                      {availableEquipPageItems.map((eq, idx) =>
                        renderDraggableItem(eq, idx)
                      )}
                      {provided.placeholder}
                    </Box>
                  </Paper>
                )}
              </Droppable>
              <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                <Pagination
                  count={availableTotalPages}
                  page={availablePage}
                  onChange={(e, value) => setAvailablePage(value)}
                  size="small"
                />
              </Box>
            </Box>

            {/* In Maintenance */}
            <Box>
              <Droppable droppableId="maintenanceList">
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ p: 2 }}
                    style={getListStyle(
                      "maintenanceList",
                      snapshot.isDraggingOver,
                      theme
                    )}
                  >
                    <Typography variant="h6" gutterBottom textAlign="center">
                      <BuildCircleIcon sx={{ mr: 1 }} />
                      In Maintenance
                    </Typography>
                    <Box
                      sx={{
                        height: "calc(100% - 60px)",
                        overflowY: "auto",
                      }}
                    >
                      {maintenanceEquipPageItems.map((eq, idx) =>
                        renderDraggableItem(eq, idx)
                      )}
                      {provided.placeholder}
                    </Box>
                  </Paper>
                )}
              </Droppable>
              <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                <Pagination
                  count={maintenanceTotalPages}
                  page={maintenancePage}
                  onChange={(e, value) => setMaintenancePage(value)}
                  size="small"
                />
              </Box>
            </Box>

            {/* Out of Service */}
            <Box>
              <Droppable droppableId="outServiceList">
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ p: 2 }}
                    style={getListStyle(
                      "outServiceList",
                      snapshot.isDraggingOver,
                      theme
                    )}
                  >
                    <Typography variant="h6" gutterBottom textAlign="center">
                      <ErrorOutlineIcon sx={{ mr: 1 }} />
                      Out of Service
                    </Typography>
                    <Box
                      sx={{
                        height: "calc(100% - 60px)",
                        overflowY: "auto",
                      }}
                    >
                      {outOfServiceEquipPageItems.map((eq, idx) =>
                        renderDraggableItem(eq, idx)
                      )}
                      {provided.placeholder}
                    </Box>
                  </Paper>
                )}
              </Droppable>
              <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                <Pagination
                  count={outOfServiceTotalPages}
                  page={outOfServicePage}
                  onChange={(e, value) => setOutOfServicePage(value)}
                  size="small"
                />
              </Box>
            </Box>
          </Box>
        </DragDropContext>
      </Box>

      {/* Right: Activity Logs & Clock */}
      <Box sx={{ width: 360, maxWidth: "100%" }}>
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            backgroundColor:
              theme.palette.mode === "dark" ? "#424242" : "#424242",
            color: "#fff",
            textAlign: "center",
            borderRadius: 2,
          }}
          elevation={3}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AccessTimeIcon sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 0 }}>
              {clockString}
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          Activity
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ textAlign: "right", mb: 1 }}>
          <Button variant="outlined" color="secondary" onClick={clearAllLogs}>
            Clear All
          </Button>
        </Box>

        <Paper
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor:
              theme.palette.mode === "dark" ? "#212121" : "#fafafa",
            color: theme.palette.mode === "dark" ? "#fafafa" : "#212121",
            maxHeight: 600,
            overflowY: "auto",
          }}
          elevation={4}
        >
          {truncatedLogs.length === 0 ? (
            <Typography
              variant="body2"
              color={theme.palette.mode === "dark" ? "#ccc" : "text.secondary"}
            >
              No recent logs...
            </Typography>
          ) : (
            truncatedLogs.map((log, idx) => (
              <Paper
                key={String(log.MaintenanceID)}
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 2,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#333" : "#fff",
                  borderRadius: 2,
                  borderColor:
                    theme.palette.mode === "dark" ? "#555" : "#ddd",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color:
                        theme.palette.mode === "dark" ? "#ccc" : "grey.700",
                    }}
                  >
                    <strong>Log #{log.MaintenanceID}</strong>
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      color="inherit"
                      onClick={() => handleEditLog(log, idx)}
                      sx={{
                        ml: 1,
                        color:
                          theme.palette.mode === "dark"
                            ? "#aaa"
                            : "grey.600",
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="inherit"
                      onClick={() => deleteLog(log.MaintenanceID)}
                      sx={{ ml: 1, color: "red" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Divider
                  sx={{
                    mb: 1,
                    borderColor:
                      theme.palette.mode === "dark" ? "#444" : "#ddd",
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.8rem",
                    color: theme.palette.mode === "dark"
                      ? "#ddd"
                      : "text.secondary",
                  }}
                >
                  <strong>Equipment #{log.EquipmentID}</strong> | Date:{" "}
                  {log.MaintenanceDate}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.8rem",
                    color: theme.palette.mode === "dark"
                      ? "#ddd"
                      : "text.secondary",
                  }}
                >
                  Issue: {log.IssueDescription || "N/A"}
                  <br />
                  Resolution: {log.Resolution || "N/A"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.8rem",
                    color: theme.palette.mode === "dark"
                      ? "#bbb"
                      : "text.secondary",
                  }}
                >
                  Notes: {log.Notes || ""}
                </Typography>
              </Paper>
            ))
          )}
        </Paper>
      </Box>

      {/* Dialog: Add Equipment */}
      <Dialog
        open={isAddOpen}
        onClose={() => setAddOpen(false)}
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
              <BuildIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Add Equipment
              </Typography>
            </Box>
            <IconButton
              onClick={() => setAddOpen(false)}
              sx={{
                "&:hover": { color: theme.palette.error.main },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 4 }}>
          <TextField
            label="Equipment Name"
            name="Name"
            fullWidth
            margin="normal"
            value={newEquipData.Name || ""}
            onChange={handleAddEquipChange}
          />

          <TextField
            label="Serial Number"
            name="SerialNumber"
            fullWidth
            margin="normal"
            value={newEquipData.SerialNumber || ""}
            onChange={handleAddEquipChange}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Select Branch</InputLabel>
            <Select
              name="BranchID"
              value={newEquipData.BranchID || ""}
              onChange={handleAddEquipChange}
            >
              {branches.map((b) => (
                <MenuItem key={b.BranchID} value={String(b.BranchID)}>
                  {b.BranchName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {addError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {addError}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddEquipSubmit}
            disabled={!newEquipData.Name?.trim() || !newEquipData.SerialNumber?.trim() || !newEquipData.BranchID}
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              px: 4,
              py: 1,
              borderRadius: 2,
            }}
          >
            <SaveIcon sx={{ mr: 1 }} /> Save Equipment
          </Button>
        </DialogActions>

      </Dialog>

      {/* STATUS TRANSITION DIALOG */}
      <Dialog
        open={modalOpen}
        onClose={handleModalCancel}
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
              <SyncAltIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Change Equipment Status
              </Typography>
            </Box>
            <IconButton
              onClick={handleModalCancel}
              sx={{
                "&:hover": { color: theme.palette.error.main },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 4 }}>
          <Typography variant="body1" gutterBottom sx={{ fontWeight: "bold" }}>
            Equipment ID: <span style={{ fontWeight: "normal" }}>{modalData.EquipmentID || "—"}</span>
          </Typography>
          <Typography variant="body1" gutterBottom>
            Changing from <strong>{modalData.oldStatus || "—"}</strong> to <strong>{modalData.newStatus || "—"}</strong>.
          </Typography>

          <TextField
            label="Date"
            name="date"
            type="date"
            margin="normal"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={modalData.date || ""}
            onChange={handleModalChange}
          />

          <TextField
            label="Time"
            name="time"
            type="time"
            margin="normal"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={modalData.time || ""}
            onChange={handleModalChange}
          />

          <TextField
            label="Reason / Notes"
            name="reason"
            margin="normal"
            fullWidth
            multiline
            rows={3}
            value={modalData.reason || ""}
            onChange={handleModalChange}
          />
        </DialogContent>

        <DialogActions sx={{ justifyContent: "flex-end", py: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleModalSave}
            sx={{
              textTransform: "none",
            }}
          >
            <SaveIcon sx={{ mr: 1 }} /> Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Edit Log Entry */}
      <Dialog open={editLogIndex !== null} onClose={handleCancelLogEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit Maintenance Log</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth multiline rows={3} value={editLogText} onChange={(e) => setEditLogText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLogEdit}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveLogEdit}>
            Save
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
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: "gray" }}>
            Cancel
          </Button>
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
}
