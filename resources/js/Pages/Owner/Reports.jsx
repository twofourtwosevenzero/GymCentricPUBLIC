import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  memo,
  useRef,
} from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import FavoriteIcon from "@mui/icons-material/Favorite";
import axios from "axios";

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
  Filler,
} from "chart.js";

// Register chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Lazy-load chart components
const Doughnut = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Doughnut }))
);
const Line = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Line }))
);
const Bar = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Bar }))
);

/**
 * Defer rendering until user scrolls to this section
 */
const LazyLoadSection = ({ children, fallback = <CircularProgress /> }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{isVisible ? children : fallback}</div>;
};

/**
 * getBranchIdForRecord(record):
 * Figures out which BranchID applies to this record,
 * checking both direct columns and nested relationships if needed.
 */
function getBranchIdForRecord(record) {
  // 1) Direct branch id
  if (record.BranchID) return record.BranchID;

  // 2) If this record has a `StartedBranchID` column (common for members)
  if (record.StartedBranchID) return record.StartedBranchID;

  // 3) If staff has an array of branches
  if (record.staff?.branches?.length) {
    return record.staff.branches[0]?.BranchID || null;
  }

  // 4) If there's facility->branch
  if (record.facility?.branch?.BranchID) {
    return record.facility.branch.BranchID;
  }

  // 5) If there's startedBranch on a relationship object
  if (record.startedBranch?.BranchID) {
    return record.startedBranch.BranchID;
  }
  // 6) If there's member->startedBranch (like in bookings)
  if (record.member?.startedBranch?.BranchID) {
    return record.member.startedBranch.BranchID;
  }

  return null;
}

/**
 * parseDateStr: convert "2025-03-10" into a numeric timestamp
 * for easy comparison
 */
function parseDateStr(dateStr) {
  if (!dateStr) return 0;
  return new Date(dateStr).getTime();
}

const Reports = () => {
  // ------------------- FILTER STATES -------------------
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");

  // ------------------- RAW DATA & LOADING -------------------
  const [rawReportsData, setRawReportsData] = useState(null);
  const [loading, setLoading] = useState(true);

  

  // Fetch unfiltered data once
  useEffect(() => {
    setLoading(true);
    axios
      .get("/reports", { withCredentials: true })
      .then((res) => {
        setRawReportsData(res.data);
      })
      .catch((err) => {
        console.error("Error loading reports:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // ------------------- HELPER FILTERS -------------------
  const meetsBranch = useCallback(
    (record) => {
      if (selectedBranch === "All Branches") return true;
      const branchId = getBranchIdForRecord(record);
      return String(branchId) === String(selectedBranch);
    },
    [selectedBranch]
  );

  const meetsDateRange = useCallback(
    (dateStr) => {
      if (!dateStr) return true;
      const dt = parseDateStr(dateStr);

      // from only
      if (dateFrom && !dateTo) {
        return dt >= parseDateStr(dateFrom);
      }
      // to only
      if (!dateFrom && dateTo) {
        return dt <= parseDateStr(dateTo);
      }
      // from & to
      if (dateFrom && dateTo) {
        const fromMs = parseDateStr(dateFrom);
        const toMs = parseDateStr(dateTo);
        return dt >= fromMs && dt <= toMs;
      }
      // no date filter
      return true;
    },
    [dateFrom, dateTo]
  );

  // -------------------------------------------------
  // MEMBERSHIP: Build Growth & Plan Dist from members
  // -------------------------------------------------
  // rawReportsData.membership.members => array of members

  const filteredGymCashFlowRecords = useMemo(() => {
    if (!rawReportsData) return [];
    
    const allRecords = rawReportsData.finance?.cashFlowRecords || [];
    
    return allRecords.filter((flow) => {
      // Must be "Gym"
      if (flow.BusinessType !== "Gym") return false;
      
      // Must meet branch filter
      if (!meetsBranch(flow)) return false;
      
      // Must meet date range filter
      if (!meetsDateRange(flow.Date)) return false;
  
      return true;
    });
  }, [rawReportsData, meetsBranch, meetsDateRange]);

  const totalGymRevenue = useMemo(() => {
    let sum = 0;
    filteredGymCashFlowRecords.forEach((flow) => {
      sum += Number(flow.TotalSales || 0);
    });
    return `₱${sum.toLocaleString()}`;
  }, [filteredGymCashFlowRecords]);
  

  const filteredMembers = useMemo(() => {
    if (!rawReportsData) return [];
    const all = rawReportsData.membership?.members || [];
    return all.filter((member) => {
      // Branch check
      if (!meetsBranch(member)) return false;
      // Date check => member.MembershipStartDate
      if (!meetsDateRange(member.MembershipStartDate)) return false;
      return true;
    });
  }, [rawReportsData, meetsBranch, meetsDateRange]);

  /**
   * membershipGrowth: group filteredMembers by "YYYY-MM" of MembershipStartDate
   */
  const membershipGrowth = useMemo(() => {
    const map = {};
    filteredMembers.forEach((mem) => {
      if (!mem.MembershipStartDate) return;
      const d = new Date(mem.MembershipStartDate);
      const ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      if (!map[ym]) map[ym] = 0;
      map[ym]++;
    });
    return Object.entries(map).map(([month, count]) => ({ month, count }));
  }, [filteredMembers]);

  /**
   * planDistribution: group filteredMembers by mem.plan.PlanName
   */
  const planDistribution = useMemo(() => {
    const map = {};
    filteredMembers.forEach((mem) => {
      // fallback to "No Plan" if mem.plan is null
      const planName = mem.plan?.PlanName || "No Plan";
      if (!map[planName]) map[planName] = 0;
      map[planName]++;
    });
    return Object.entries(map).map(([planName, count]) => ({ planName, count }));
  }, [filteredMembers]);

  // membershipGrowthData for the chart
  const membershipGrowthData = useMemo(() => {
    return {
      labels: membershipGrowth.map((item) => item.month),
      datasets: [
        {
          label: "New Members",
          data: membershipGrowth.map((item) => item.count),
          borderColor: "#ffa726",
          backgroundColor: "rgba(255,167,38,0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [membershipGrowth]);

  const membershipDistData = useMemo(() => {
    return {
      labels: planDistribution.map((p) => p.planName),
      datasets: [
        {
          data: planDistribution.map((p) => p.count),
          backgroundColor: [
            "#42a5f5",
            "#66bb6a",
            "#ef5350",
            "#ffa726",
            "#ab47bc",
            "#ffee58",
          ],
        },
      ],
    };
  }, [planDistribution]);

  // KPI for new members
  const newMembersThisPeriod = useMemo(() => {
    return membershipGrowth.reduce((sum, item) => sum + item.count, 0);
  }, [membershipGrowth]);

  // -------------------------------------------------
  // FINANCE: from rawReportsData.finance.cashFlowRecords
  // -------------------------------------------------
  const filteredCashFlowRecords = useMemo(() => {
    if (!rawReportsData) return [];
    const all = rawReportsData.finance?.cashFlowRecords || [];
    return all.filter((r) => meetsBranch(r) && meetsDateRange(r.Date));
  }, [rawReportsData, meetsBranch, meetsDateRange]);

  const totalRevenue = useMemo(() => {
    let sum = 0;
    filteredCashFlowRecords.forEach((r) => {
      sum += Number(r.TotalSales || 0);
    });
    return `₱${sum.toLocaleString()}`;
  }, [filteredCashFlowRecords]);

  // -------------------------------------------------
  // STAFF: from rawReportsData.staff.attendanceRecords
  // -------------------------------------------------
  const filteredAttendanceRecords = useMemo(() => {
    if (!rawReportsData) return [];
    const all = rawReportsData.staff?.attendanceRecords || [];
    return all.filter((att) => meetsBranch(att) && meetsDateRange(att.Date));
  }, [rawReportsData, meetsBranch, meetsDateRange]);

  // group by week
  const weeklyAttendance = useMemo(() => {
    const map = {};
    filteredAttendanceRecords.forEach((rec) => {
      const d = new Date(rec.Date);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
      const key = `${d.getFullYear()}-W${weekNo}`;
      if (!map[key]) map[key] = 0;
      map[key]++;
    });
    return Object.entries(map).map(([week, total]) => ({ week, totalAttendance: total }));
  }, [filteredAttendanceRecords]);

  const attendanceAnalyticsData = useMemo(() => {
    return {
      labels: weeklyAttendance.map((w) => w.week),
      datasets: [
        {
          label: "Total Attendance",
          data: weeklyAttendance.map((w) => w.totalAttendance),
          borderColor: "#5c6bc0",
          backgroundColor: "rgba(92,107,192,0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [weeklyAttendance]);

  // staff attendance rate
  const attendanceRate = useMemo(() => {
    if (!weeklyAttendance.length) return "0%";
    const sum = weeklyAttendance.reduce((acc, w) => acc + w.totalAttendance, 0);
    const avg = sum / weeklyAttendance.length;
    return `${Math.round(avg)}%`;
  }, [weeklyAttendance]);

  // -------------------------------------------------
  // BOOKING: from rawReportsData.booking.bookings
  // -------------------------------------------------
  const filteredBookings = useMemo(() => {
    if (!rawReportsData) return [];
    const all = rawReportsData.booking?.bookings || [];
    return all.filter((b) => meetsBranch(b) && meetsDateRange(b.BookingDate));
  }, [rawReportsData, meetsBranch, meetsDateRange]);

  // group by month
  const bookingTrendsArr = useMemo(() => {
    const map = {};
    filteredBookings.forEach((bk) => {
      const d = new Date(bk.BookingDate);
      const ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      if (!map[ym]) map[ym] = 0;
      map[ym]++;
    });
    return Object.entries(map).map(([month, total]) => ({ month, totalBookings: total }));
  }, [filteredBookings]);

  const bookingTrendsData = useMemo(() => {
    return {
      labels: bookingTrendsArr.map((b) => b.month),
      datasets: [
        {
          label: "Total Bookings",
          data: bookingTrendsArr.map((b) => b.totalBookings),
          borderColor: "#8d6e63",
          backgroundColor: "rgba(141,110,99,0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [bookingTrendsArr]);

  // keep server's field for popular service or re-derive if needed
  const mostPopularService = useMemo(() => {
    return rawReportsData?.booking?.mostPopularService || "N/A";
  }, [rawReportsData]);

  // ------------------- HANDLERS -------------------
  const handleDateFromChange = useCallback((e) => setDateFrom(e.target.value), []);
  const handleDateToChange = useCallback((e) => setDateTo(e.target.value), []);
  const handleBranchChange = useCallback((e) => setSelectedBranch(e.target.value), []);
  const handleFilterApply = useCallback(() => {
    console.log("Filters =>", { dateFrom, dateTo, selectedBranch });
  }, [dateFrom, dateTo, selectedBranch]);

  // ------------------- RENDER -------------------
  if (loading) {
    return (
      <Box sx={{ py: 4, display: "flex", justifyContent: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!rawReportsData) {
    return <div>No data returned from /reports.</div>;
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Filter Section */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 2,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}
      >
        <TextField
          type="date"
          size="small"
          label="From"
          InputLabelProps={{ shrink: true }}
          value={dateFrom}
          onChange={handleDateFromChange}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          InputLabelProps={{ shrink: true }}
          value={dateTo}
          onChange={handleDateToChange}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Branch</InputLabel>
          <Select value={selectedBranch} label="Branch" onChange={handleBranchChange}>
            <MenuItem value="All Branches">All Branches</MenuItem>
            {(rawReportsData.branches || []).map((b) => (
              <MenuItem key={b.BranchID} value={b.BranchID}>
                {b.BranchName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" onClick={handleFilterApply}>
          FILTER
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Finance: totalRevenue */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: "text.primary",
              color: "background.paper",
              display: "flex",
              alignItems: "center",
              p: 1,
            }}
          >
            <Typography
              sx={{ fontSize: 40, color: "#42a5f5", mr: 2, fontWeight: "bold" }}
            >
              ₱
            </Typography>
            <CardContent>
              <Typography variant="h6">Total Gym Revenue</Typography>
              <Typography variant="h5">{totalGymRevenue}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Membership: newMembersThisPeriod */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: "text.primary",
              color: "background.paper",
              display: "flex",
              alignItems: "center",
              p: 1,
            }}
          >
            <PersonAddIcon sx={{ fontSize: 40, color: "#e53935", mr: 2 }} />
            <CardContent>
              <Typography variant="h6">Total Members</Typography>
              <Typography variant="h5">
                {membershipGrowth.reduce((sum, item) => sum + item.count, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance Rate KPI */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: "text.primary",
              color: "background.paper",
              display: "flex",
              alignItems: "center",
              p: 1,
            }}
          >
            <FavoriteIcon sx={{ fontSize: 40, color: "#43a047", mr: 2 }} />
            <CardContent>
              <Typography variant="h6">Staff Attendance Rate</Typography>
              <Typography variant="h5">{attendanceRate}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Booking: Most Popular Service */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              bgcolor: "text.primary",
              color: "background.paper",
              display: "flex",
              alignItems: "center",
              p: 1,
            }}
          >
            <GroupWorkIcon sx={{ fontSize: 40, color: "#ffca28", mr: 2 }} />
            <CardContent>
              <Typography variant="h6">Popular Service</Typography>
              <Typography variant="h5">{mostPopularService}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* MEMBERSHIP: Distribution & Growth */}
      <LazyLoadSection fallback={<CircularProgress />}>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* Plan Distribution */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                height: 320,
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Membership Plan Distribution
              </Typography>
              <Box sx={{ flex: 1, position: "relative" }}>
                <Suspense fallback={<CircularProgress />}>
                  <Doughnut
                    data={{
                      labels: planDistribution.map((p) => p.planName),
                      datasets: [
                        {
                          data: planDistribution.map((p) => p.count),
                          backgroundColor: [
                            "#42a5f5",
                            "#66bb6a",
                            "#ef5350",
                            "#ffa726",
                            "#ab47bc",
                            "#ffee58",
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                </Suspense>
              </Box>
            </Paper>
          </Grid>

          {/* Growth Over Time */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                height: 320,
                display: "flex",
                flexDirection: "column",
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Membership Growth Over Time
              </Typography>
              <Box sx={{ flex: 1, position: "relative" }}>
                <Suspense fallback={<CircularProgress />}>
                  <Line
                    data={{
                      labels: membershipGrowth.map((m) => m.month),
                      datasets: [
                        {
                          label: "New Members",
                          data: membershipGrowth.map((m) => m.count),
                          borderColor: "#ffa726",
                          backgroundColor: "rgba(255,167,38,0.2)",
                          fill: true,
                          tension: 0.3,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: { y: { beginAtZero: true } },
                      plugins: { legend: { display: false } },
                    }}
                  />
                </Suspense>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </LazyLoadSection>

      {/* STAFF ATTENDANCE */}
      <LazyLoadSection fallback={<CircularProgress />}>
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 4,
            borderRadius: 2,
            height: 320,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Staff Attendance Over Time
          </Typography>
          <Box sx={{ flex: 1, position: "relative" }}>
            <Suspense fallback={<CircularProgress />}>
              <Line
                data={attendanceAnalyticsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true } },
                  plugins: { legend: { display: false } },
                }}
              />
            </Suspense>
          </Box>
        </Paper>
      </LazyLoadSection>

      {/* BOOKING TRENDS */}
      <LazyLoadSection fallback={<CircularProgress />}>
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 4,
            borderRadius: 2,
            height: 320,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Booking Trends Over Time
          </Typography>
          <Box sx={{ flex: 1, position: "relative" }}>
            <Suspense fallback={<CircularProgress />}>
              <Line
                data={bookingTrendsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true } },
                  plugins: { legend: { display: false } },
                }}
              />
            </Suspense>
          </Box>
        </Paper>
      </LazyLoadSection>
    </Box>
  );
};

export default memo(Reports);
