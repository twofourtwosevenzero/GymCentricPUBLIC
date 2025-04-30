import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  CircularProgress,
  TextField,
  InputAdornment,
  Snackbar,
  FormControl,
  FormHelperText,
} from "@mui/material";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "react-beautiful-dnd";
import {
  Pending as PendingIcon,
  WorkOutline as WorkOutlineIcon,
  Done as DoneIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { AccessTime, AlarmOn, AlarmOff, Schedule as ScheduleIcon } from "@mui/icons-material";

// Helpers to format dates and times
const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (timeString) => {
  if (!timeString) return "—";
  let [hours, minutes] = timeString.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

// Updated card style for drag-and-drop items
function getItemStyle(isDragging, draggableStyle) {
  return {
    userSelect: "none",
    padding: 24,
    margin: "0 0 12px 0",
    background: isDragging ? "#9c27b0" : "#fff",
    color: isDragging ? "#fff" : "#000",
    borderRadius: 6,
    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
    ...draggableStyle,
  };
}

function getListStyle(droppableId, isDraggingOver) {
  const statusColors = {
    Pending: "#ffd8b2",
    InProgress: "#d0d0ff",
    Completed: "#c8e6c9",
  };
  return {
    background: isDraggingOver ? "#f0f0f0" : statusColors[droppableId] || "#f5f5f5",
    padding: 8,
    width: "100%",
    minHeight: 700,
    borderRadius: 8,
  };
}

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export default function TaskTimeManagement({ isStaff = true }) {
  // Task Management state
  const [pendingTasks, setPendingTasks] = useState([]);
  const [inProgressTasks, setInProgressTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [inProgressPage, setInProgressPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const tasksPerPage = 5;

  // New Task Dialog state
  const [openNewTaskDialog, setOpenNewTaskDialog] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Attendance and Schedule state
  const [attendance, setAttendance] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [staffId, setStaffId] = useState(null);
  const [staffBranch, setStaffBranch] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Snackbar state
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const showSuccessMessage = (msg) => {
    setSnackMessage(msg);
    setSnackOpen(true);
  };

  // Fetch tasks data
  const fetchTasks = () => {
    fetch("/staff/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const normalized = data.map((item) => ({
            ...item,
            status: item.Status,
            description: item.TaskDescription,
          }));
          setPendingTasks(normalized.filter((task) => task.status === "Pending"));
          setInProgressTasks(normalized.filter((task) => task.status === "InProgress"));
          setCompletedTasks(normalized.filter((task) => task.status === "Completed"));
        }
      })
      .catch((err) => console.error("Failed to load tasks:", err));
  };

  useEffect(() => {
    fetchTasks();
  }, []);
  
  // Fetch attendance, schedule and staff info
  useEffect(() => {
    const fetchAttendanceAndSchedule = async () => {
      setLoadingAttendance(true);
      try {
        // Fetch attendance records
        const attendRes = await fetch("/staff/attendance");
        const attendData = await attendRes.json();
        const fetchedAttendance = Array.isArray(attendData)
          ? attendData
          : attendData.attendance || [];
        setAttendance(fetchedAttendance);

        // Determine if staff is clocked in for today
        const todayDate = new Date().toISOString().split("T")[0];
        const todaysRecords = fetchedAttendance.filter((rec) => rec.Date === todayDate);
        const clockedInRecord = todaysRecords.find((rec) => rec.TimeIn && !rec.TimeOut);
        setIsClockedIn(!!clockedInRecord);

        // Fetch work schedule
        const scheduleRes = await fetch("/staff/schedules");
        const scheduleData = await scheduleRes.json();
        setSchedule(scheduleData || []);

        // Fetch staff info if not already set
        if (!staffId) {
          const staffRes = await fetch("/staff/get-logged-in-staff");
          const staffData = await staffRes.json();
          if (staffData && staffData.StaffID) {
            setStaffId(staffData.StaffID);
            setStaffBranch(staffData.BranchID);
          }
        }
      } catch (error) {
        console.error("Error fetching attendance/schedule:", error);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendanceAndSchedule();
  }, [staffId]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Refresh clock state (used after clock in/out)
  const refreshClockState = async () => {
    try {
      const attendRes = await fetch("/staff/attendance");
      const attendData = await attendRes.json();
      const fetchedAttendance = Array.isArray(attendData)
        ? attendData
        : attendData.attendance || [];
      const todayDate = new Date().toISOString().split("T")[0];
      const clockedInRecord = fetchedAttendance.find(
        (rec) => rec.Date === todayDate && rec.TimeIn && !rec.TimeOut
      );
      const newState = !!clockedInRecord;
      setIsClockedIn(newState);
      return newState;
    } catch (error) {
      console.error("Error refreshing clock state:", error);
      return false;
    }
  };

  // Handle Clock In/Out button click
  const handleClockInOut = async () => {
    let currentStaffId = staffId;
    if (!currentStaffId) {
      try {
        const staffRes = await fetch("/staff/get-logged-in-staff");
        const staffData = await staffRes.json();
        if (staffData && staffData.StaffID) {
          currentStaffId = staffData.StaffID;
          setStaffId(currentStaffId);
          setStaffBranch(staffData.BranchID);
        } else {
          console.warn("No staffId available after refetch.");
          return;
        }
      } catch (err) {
        console.error("Error refetching staff info:", err);
        return;
      }
    }
    const dateStr = new Date().toISOString().split("T")[0];
    const timeStr = currentTime.toLocaleTimeString("it-IT").slice(0, 5);
    const clockData = {
      StaffID: currentStaffId,
      BranchID: staffBranch,
      Date: dateStr,
      // If not clocked in, set TimeIn; if already clocked in, set TimeOut.
      TimeIn: isClockedIn ? null : timeStr,
      TimeOut: isClockedIn ? timeStr : null,
    };
    try {
      await fetch("/staff/attendance/clock-in-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clockData),
      });
      // Short delay before refreshing state
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newClockState = await refreshClockState();
      showSuccessMessage(
        newClockState ? "Clocked in successfully." : "Clocked out successfully."
      );
    } catch (err) {
      console.error("Failed to record attendance:", err);
    }
  };

  // Drag & Drop handlers for tasks
  const columns = {
    Pending: { tasks: pendingTasks, setTasks: setPendingTasks, page: pendingPage },
    InProgress: { tasks: inProgressTasks, setTasks: setInProgressTasks, page: inProgressPage },
    Completed: { tasks: completedTasks, setTasks: setCompletedTasks, page: completedPage },
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    const sourceOffset = (columns[sourceCol].page - 1) * tasksPerPage;
    const destOffset = (columns[destCol].page - 1) * tasksPerPage;
    const sourceIndex = sourceOffset + source.index;
    const destIndex = destOffset + destination.index;

    if (sourceCol === destCol) {
      const newColumnTasks = reorder(
        columns[sourceCol].tasks,
        sourceIndex,
        destIndex
      );
      columns[sourceCol].setTasks(newColumnTasks);
      const movedTask = newColumnTasks[destIndex];
      movedTask.status = destCol;
      if (movedTask.TaskID) {
        try {
          const csrfToken =
            document.querySelector('meta[name="csrf-token"]')?.content || "";
          await fetch(`/staff/tasks/${movedTask.TaskID}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-TOKEN": csrfToken,
            },
            body: JSON.stringify({ Status: movedTask.status }),
          });
        } catch (err) {
          console.error("Failed to update task status:", err);
        }
      }
    } else {
      const sourceTasks = Array.from(columns[sourceCol].tasks);
      const destTasks = Array.from(columns[destCol].tasks);
      const [movedTask] = sourceTasks.splice(sourceIndex, 1);
      movedTask.status = destCol;
      destTasks.splice(destIndex, 0, movedTask);
      columns[sourceCol].setTasks(sourceTasks);
      columns[destCol].setTasks(destTasks);
      if (movedTask.TaskID) {
        try {
          const csrfToken =
            document.querySelector('meta[name="csrf-token"]')?.content || "";
          await fetch(`/staff/tasks/${movedTask.TaskID}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-TOKEN": csrfToken,
            },
            body: JSON.stringify({ Status: movedTask.status }),
          });
        } catch (err) {
          console.error("Failed to update task status:", err);
        }
      }
    }
  };

  // Delete confirmation dialog handlers for tasks
  const handleOpenDeleteDialog = (task) => {
    setTaskToDelete(task);
    setOpenDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDialog(false);
    setTaskToDelete(null);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    setCompletedTasks((prevTasks) =>
      prevTasks.filter(
        (task) =>
          (task.TaskID || task.id) !== (taskToDelete.TaskID || taskToDelete.id)
      )
    );
    handleCloseDeleteDialog();
  };

  // Render a single task item
  const renderTaskItem = (task, idx) => {
    const taskId = task.TaskID || task.id || `temp-${idx}`;
    return (
      <Draggable key={taskId} draggableId={String(taskId)} index={idx}>
        {(provided, snapshot) => (
          <Paper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">
                {task.description || "Untitled Task"}
              </Typography>
              <Box display="flex" alignItems="center">
                {task.status === "Pending" && (
                  <Chip label="Pending" color="warning" size="small" />
                )}
                {task.status === "InProgress" && (
                  <Chip label="In Progress" color="info" size="small" />
                )}
                {task.status === "Completed" && (
                  <Chip label="Completed" color="success" size="small" />
                )}
                {task.status === "Completed" && isStaff && (
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDeleteDialog(task)}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
            <Box mt={1} display="flex" justifyContent="space-between">
              {task.TaskDate ? (
                <Typography variant="caption">
                  Due: {new Date(task.TaskDate).toLocaleDateString()}
                </Typography>
              ) : (
                <Typography variant="caption" color="textSecondary">
                  No due date
                </Typography>
              )}
              <Avatar sx={{ width: 24, height: 24 }}>
                {task.staff ? (task.staff.FullName || "?").charAt(0) : "?"}
              </Avatar>
            </Box>
          </Paper>
        )}
      </Draggable>
    );
  };

  // Compute paginated tasks for each column
  const paginatedPendingTasks = pendingTasks.slice(
    (pendingPage - 1) * tasksPerPage,
    pendingPage * tasksPerPage
  );
  const paginatedInProgressTasks = inProgressTasks.slice(
    (inProgressPage - 1) * tasksPerPage,
    inProgressPage * tasksPerPage
  );
  const paginatedCompletedTasks = completedTasks.slice(
    (completedPage - 1) * tasksPerPage,
    completedPage * tasksPerPage
  );

  // Handle open/close new task dialog
  const handleOpenNewTaskDialog = () => {
    setOpenNewTaskDialog(true);
  };

  const handleCloseNewTaskDialog = () => {
    setOpenNewTaskDialog(false);
    setNewTaskDescription("");
    setNewTaskDate("");
    setFormErrors({});
  };

  // Handle task form submission
  const handleSubmitNewTask = async () => {
    // Form validation
    const errors = {};
    if (!newTaskDescription.trim()) {
      errors.description = "Task description is required";
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";
      
      const response = await fetch("/staff/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({
          StaffID: staffId,
          TaskDescription: newTaskDescription,
          TaskDate: newTaskDate || null,
          Status: "Pending",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add the new task to pending tasks
        setPendingTasks((prevTasks) => [
          {
            ...data.task,
            status: data.task.Status,
            description: data.task.TaskDescription,
          },
          ...prevTasks,
        ]);
        showSuccessMessage("Task created successfully!");
        handleCloseNewTaskDialog();
        fetchTasks(); // Refresh all tasks
      } else {
        const errorData = await response.json();
        showSuccessMessage("Failed to create task: " + (errorData.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating task:", error);
      showSuccessMessage("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: "flex", gap: 3 }}>
        {/* Left Column: Task Management */}
        <Box sx={{ flex: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4">
              Task Management
            </Typography>
            {isStaff && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenNewTaskDialog}
              >
                Add Task
              </Button>
            )}
          </Box>
          <Divider sx={{ mb: 2 }} />
          <DragDropContext onDragEnd={onDragEnd}>
            <Box display="flex" gap={3} sx={{ width: "100%" }}>
              {/* Pending Column */}
              <Droppable droppableId="Pending">
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={getListStyle("Pending", snapshot.isDraggingOver)}
                    sx={{ flex: 1 }}
                  >
                    <Typography variant="h6" p={2}>
                      <PendingIcon /> Pending ({pendingTasks.length})
                    </Typography>
                    {paginatedPendingTasks.map((task, idx) =>
                      renderTaskItem(task, idx)
                    )}
                    {provided.placeholder}
                    <Box display="flex" justifyContent="center" mt={1}>
                      <Pagination
                        count={Math.ceil(pendingTasks.length / tasksPerPage)}
                        page={pendingPage}
                        onChange={(e, value) => setPendingPage(value)}
                        size="small"
                      />
                    </Box>
                  </Paper>
                )}
              </Droppable>

              {/* In Progress Column */}
              <Droppable droppableId="InProgress">
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={getListStyle("InProgress", snapshot.isDraggingOver)}
                    sx={{ flex: 1 }}
                  >
                    <Typography variant="h6" p={2}>
                      <WorkOutlineIcon /> In Progress ({inProgressTasks.length})
                    </Typography>
                    {paginatedInProgressTasks.map((task, idx) =>
                      renderTaskItem(task, idx)
                    )}
                    {provided.placeholder}
                    <Box display="flex" justifyContent="center" mt={1}>
                      <Pagination
                        count={Math.ceil(inProgressTasks.length / tasksPerPage)}
                        page={inProgressPage}
                        onChange={(e, value) => setInProgressPage(value)}
                        size="small"
                      />
                    </Box>
                  </Paper>
                )}
              </Droppable>

              {/* Completed Column */}
              <Droppable droppableId="Completed">
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={getListStyle("Completed", snapshot.isDraggingOver)}
                    sx={{ flex: 1 }}
                  >
                    <Typography variant="h6" p={2}>
                      <DoneIcon /> Completed ({completedTasks.length})
                    </Typography>
                    {paginatedCompletedTasks.map((task, idx) =>
                      renderTaskItem(task, idx)
                    )}
                    {provided.placeholder}
                    <Box display="flex" justifyContent="center" mt={1}>
                      <Pagination
                        count={Math.ceil(completedTasks.length / tasksPerPage)}
                        page={completedPage}
                        onChange={(e, value) => setCompletedPage(value)}
                        size="small"
                      />
                    </Box>
                  </Paper>
                )}
              </Droppable>
            </Box>
          </DragDropContext>
        </Box>
    
      </Box>

      {/* New Task Dialog */}
      <Dialog open={openNewTaskDialog} onClose={handleCloseNewTaskDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl error={!!formErrors.description} fullWidth>
              <TextField
                autoFocus
                margin="dense"
                label="Task Description"
                type="text"
                fullWidth
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                error={!!formErrors.description}
                disabled={isSubmitting}
                placeholder="What do you need to do?"
              />
              {formErrors.description && (
                <FormHelperText>{formErrors.description}</FormHelperText>
              )}
            </FormControl>

            <TextField
              margin="dense"
              label="Due Date (Optional)"
              type="date"
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              value={newTaskDate}
              onChange={(e) => setNewTaskDate(e.target.value)}
              disabled={isSubmitting}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewTaskDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitNewTask} 
            color="primary" 
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Task"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDeleteDialog} fullWidth maxWidth="xs">
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontWeight: "bold",
          }}
        >
          <DeleteForeverIcon color="error" />
          Delete Task
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete this task? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteTask}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message={snackMessage}
      />
    </Box>
  );
}
