<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\Staff;
use App\Models\StaffTask;
use App\Models\StaffSchedule;
use App\Models\Attendance;
use App\Models\Payroll;
use App\Models\Bonus;
use App\Models\Branch;
use App\Models\MaintenanceLog;
use Illuminate\Support\Arr;
// use Illuminate\Validation\Rule; // If you do advanced uniqueness checks

class StaffController extends Controller
{
    /**
     * staffDashboardInfo (REMOTE VERSION)
     */
    public function staffDashboardInfo()
    {
        $admin = auth('admin')->user();
        $assignedBranchIDs = $admin->branches()->pluck('branches.BranchID')->toArray();
        $staffUser = auth('staff')->user();
        if (!$staffUser) {
            return response()->json(['error' => 'Not logged in'], 401);
        }

        // Double check if the staff user’s BranchID is in the $assignedBranchIDs
        if (! in_array($staffUser->BranchID, $assignedBranchIDs)) {
            return response()->json(['error' => 'Unauthorized branch'], 403);
        }

        // Fetch tasks, attendance, schedules for this single staff
        $tasks = StaffTask::with('staff')
            ->where('StaffID', $staffUser->StaffID)
            ->orderBy('TaskID','desc')
            ->get();

        $attendance = Attendance::with('staff')
            ->where('StaffID', $staffUser->StaffID)
            ->orderBy('Date','desc')
            ->get();

        $schedules = StaffSchedule::with('staff')
            ->where('StaffID', $staffUser->StaffID)
            ->orderBy('ShiftDate','desc')
            ->get();

        return response()->json([
            'staffId'    => $staffUser->StaffID,
            'tasks'      => $tasks,
            'attendance' => $attendance,
            'schedule'   => $schedules,
        ]);
    }
    
    public function getAuthUser(Request $request) 
    {
        $staff = Auth::user();
    
        // Return 401 if not authenticated
        if (!$staff) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
    
        // Now safe to call load()
        $staff->load('branches');
    
        return response()->json([
            'StaffID'         => $staff->StaffID,
            'FullName'        => $staff->FullName,
            'DefaultBranchID' => $staff->default_branch_id,
        ]);
    }
    
    
    
    /**
     * LIST ALL STAFF (REMOTE VERSION)
     */
    public function indexStaff()
    {
        $admin = auth('admin')->user();
        if ($admin) {
            // Get an array of branch IDs assigned to the admin
            $assignedBranchIDs = $admin->branches()->pluck('branches.BranchID')->toArray();
    
            // Query only those staff that belong to one or more of these branches
            $staff = Staff::with(['branch', 'branches'])
                ->whereHas('branches', function ($query) use ($assignedBranchIDs) {
                    $query->whereIn('branches.BranchID', $assignedBranchIDs);
                })
                ->orderBy('StaffID', 'desc')
                ->get();
        } else {
            // Fallback: if no admin is logged in, return all staff (or handle accordingly)
            $staff = Staff::with(['branch', 'branches'])->orderBy('StaffID', 'desc')->get();
        }
        return response()->json($staff);
    }
    

    /**
     * LIST ALL STAFF JSON (REMOTE VERSION)
     */
    public function indexStaffJson()
    {
        if (auth('admin')->check()) {
            $admin = auth('admin')->user();
            $assignedBranchIDs = $admin->branches()->pluck('branches.BranchID')->toArray();
    
            $staff = Staff::with(['branches' => function($query) {
                            $query->select('branches.BranchID', 'BranchName');
                        }])
                        ->whereHas('branches', function($q) use ($assignedBranchIDs) {
                            $q->whereIn('branches.BranchID', $assignedBranchIDs);
                        })
                        ->orderBy('FullName')
                        ->get();
        } elseif (auth('staff')->check()) {
            // For logged-in staff, filter by the branch(es) assigned to that staff account.
            $staffUser = auth('staff')->user();
            $assignedBranchIDs = $staffUser->branches()->pluck('branches.BranchID')->toArray();
    
            $staff = Staff::with(['branches' => function($query) {
                            $query->select('branches.BranchID', 'BranchName');
                        }])
                        ->whereHas('branches', function($q) use ($assignedBranchIDs) {
                            $q->whereIn('branches.BranchID', $assignedBranchIDs);
                        })
                        ->orderBy('FullName')
                        ->get();
        } elseif (auth('owner')->check()) {
            $staff = Staff::with(['branches' => function($query) {
                            $query->select('branches.BranchID', 'BranchName');
                        }])
                        ->orderBy('FullName')
                        ->get();
        } else {
            $staff = [];
        }
    
        return response()->json($staff);
    }
    
    

    /**
     * (Optional) CREATE STAFF (REMOTE VERSION)
     */
    public function createStaff()
    {
        $branches = Branch::orderBy('BranchName')->get();
        return response()->json(['branches' => $branches]);
    }

    /**
     * STORE STAFF (REMOTE VERSION)
     */
    public function storeStaff(Request $request)
    {
        $data = $request->validate([
            'FullName'   => 'required|string|max:255',
            'Role'       => 'required|string|max:50',
            'Email'      => 'required|email|unique:staff,Email',
            'Phone'      => 'nullable|string|max:50',
            'BranchID'   => 'required|exists:branches,BranchID',
            'DateHired'  => 'nullable|date',
            'DailyRate'  => 'nullable|numeric|min:0',
            'Notes'      => 'nullable|string',
            'password'   => 'sometimes|nullable|min:8|confirmed',
            'BranchIDs'  => 'nullable|array',
            'BranchIDs.*'=> 'exists:branches,BranchID',
        ]);
    
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
    
        $branchIDs = $data['BranchIDs'] ?? [];
        unset($data['BranchIDs']);
    
        // 1) If DailyRate is given, fill Hourly & Overtime
        if (!empty($data['DailyRate'])) {
            $hr = $data['DailyRate'] / 8;      // e.g. 500 / 8 = 62.5
            $ot = $hr * 1.25;                  // e.g. 62.5 * 1.25 = 78.125
    
            $data['HourlyRate']   = round($hr, 2);
            $data['OvertimeRate'] = round($ot, 2);
        }
    
        // 2) Create staff
        $staff = Staff::create($data);
    
        // 3) Attach pivot branches
        $staff->branches()->attach($data['BranchID']);
        if (!empty($branchIDs)) {
            $staff->branches()->attach($branchIDs);
        }
    
        return response()->json($staff, 201);
    }
    

    /**
     * EDIT STAFF (REMOTE VERSION)
     */
    public function editStaff($id)
    {
        $staff = Staff::with('branches')->findOrFail($id);
        $allBranches = Branch::orderBy('BranchName')->get();

        return response()->json([
            'staff'    => $staff,
            'branches' => $allBranches,
        ]);
    }

    public function updateStaff(Request $request, $id)
    {
        $staff = Staff::findOrFail($id);
    
        $data = $request->validate([
            'FullName'   => 'required|string|max:255',
            'Role'       => 'required|string|max:50',
            'Email'      => 'required|email',
            'Phone'      => 'nullable|string|max:50',
            'DateHired'  => 'nullable|date',
            'DailyRate'  => 'nullable|numeric|min:0',
            'Notes'      => 'nullable|string',
            'BranchIDs'  => 'nullable|array',
            'BranchIDs.*'=> 'exists:branches,BranchID',
        ]);
    
        // If DailyRate changed, recalc & store Hourly / OT
        if (isset($data['DailyRate'])) {
            $daily = (float) $data['DailyRate'];
            $hr = $daily > 0 ? $daily / 8 : 0;
            $ot = $hr * 1.25;
    
            // Round or format as needed
            $data['HourlyRate']   = round($hr, 2);
            $data['OvertimeRate'] = round($ot, 2);
        }
    
        // Update staff columns (except BranchIDs)
        $staff->update(Arr::except($data, ['BranchIDs']));
    
        // Sync pivot if BranchIDs present
        if (isset($data['BranchIDs'])) {
            $staff->branches()->sync($data['BranchIDs']);
        }
    
        // Reload relationships
        $staff->load('branches');
    
        return response()->json([
            'message' => 'Staff updated',
            'staff'   => $staff
        ]);
    }
    

    /**
     * DEACTIVATE STAFF (REMOTE VERSION)
     */
    public function deactivateStaff($id)
    {
        $staff = Staff::findOrFail($id);
        $staff->update(['Role' => 'Inactive']);

        return response()->json([
            'message' => 'Staff deactivated.',
            'staff'   => $staff,
        ]);
    }

    /**
     * DELETE STAFF (REMOTE VERSION)
     */
    public function destroyStaff($id)
    {
        $staff = Staff::findOrFail($id);
        $staff->delete();

        return response()->json(['message' => 'Staff record removed.']);
    }

    /**
     * GET STAFF METRICS (REMOTE VERSION)
     */
    public function getStaffMetrics()
    {
        $staff = auth('staff')->user();
        if (!$staff) {
            return response()->json(['error' => 'Not authenticated as staff'], 401);
        }

        $branchIDs = $staff->branches->pluck('BranchID');

        $lockersInUse = \DB::table('lockers')
            ->whereIn('BranchID', $branchIDs)
            ->where('Status', 'Occupied')
            ->count();

        $today = now()->format('Y-m-d');
        $checkInsToday = \DB::table('member_visits')
            ->whereDate('VisitDate', $today)
            ->whereIn('BranchID', $branchIDs)
            ->count();

        $pendingIssues = MaintenanceLog::where('Resolution', 'pending')
            ->whereHas('equipment', function ($query) use ($branchIDs) {
                $query->whereIn('BranchID', $branchIDs);
            })
            ->count();

        return response()->json([
            'checkInsToday' => $checkInsToday,
            'lockersInUse'  => $lockersInUse,
            'pendingIssues' => $pendingIssues,
        ]);
    }

    /**
     * GET LOGGED-IN STAFF
     */
    public function getLoggedInStaff()
    {
        $staff = auth('staff')->user(); // Retrieve authenticated staff
    
        if (!$staff) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
    
        // Assuming you have a many-to-many relationship defined as:
        // public function branches() {
        //     return $this->belongsToMany(Branch::class, 'branch_staff', 'StaffID', 'BranchID');
        // }
        $branch = $staff->branches()->first(); // Get the first associated branch
    
        return response()->json([
            'StaffID'  => $staff->StaffID,
            'FullName' => $staff->FullName,
            'BranchID' => $branch ? $branch->BranchID : null, // Return the BranchID from the pivot relationship
        ]);
    }
    

    /* ------------------------------------------------------------------
     * ATTENDANCE (REMOTE VERSION)
     * ------------------------------------------------------------------ */

     public function indexAttendance(Request $request)
     {
         $staff = auth('staff')->user();
         $branchID = $request->input('branchID'); // e.g. ?branchID=1
     
         // If the front end passes a branchID => return attendance for *that* branch
         if ($branchID) {
             $attendance = Attendance::with('staff.branches')
                 ->whereHas('staff.branches', function ($q) use ($branchID) {
                     // Filter by the "BranchID" column in the "branches" table
                     $q->where('branches.BranchID', $branchID);
                 })
                 ->orderBy('Date', 'desc')
                 ->get();
     
             return response()->json($attendance);
         }
     
         // Otherwise fallback: if staff is logged in, show only that staff's attendance
         if ($staff) {
             $attendance = Attendance::with('staff')
                 ->where('StaffID', $staff->StaffID)
                 ->orderBy('Date', 'desc')
                 ->get();
     
             return response()->json($attendance);
         }
     
         // If no staff is logged in and no branchID => return all
         $attendance = Attendance::with('staff')
             ->orderBy('Date','desc')
             ->get();
     
         return response()->json($attendance);
     }
     

    public function storeAttendance(Request $request)
    {
        $data = $request->validate([
            'StaffID'       => 'required|exists:staff,StaffID',
            'Date'          => 'required|date',
            'TimeIn'        => 'nullable|date_format:H:i:s',
            'TimeOut'       => 'nullable|date_format:H:i:s|after:TimeIn',
            'OvertimeHours' => 'nullable|numeric|min:0',
        ]);
    
        $attendance = new Attendance();
        $attendance->StaffID       = $data['StaffID'];
        $attendance->Date          = $data['Date'];
        $attendance->TimeIn        = $data['TimeIn'] ?? null;
        $attendance->TimeOut       = $data['TimeOut'] ?? null;
        $attendance->HoursWorked   = 0;
        $attendance->OvertimeHours = $data['OvertimeHours'] ?? 0;
        $attendance->NightDiffHours = 0;  // <-- Make sure default is 0
        $attendance->LateMinutes    = 0;  // <-- default 0
    
        if ($attendance->TimeIn && $attendance->TimeOut) {
            $in  = strtotime($attendance->Date.' '.$attendance->TimeIn);
            $out = strtotime($attendance->Date.' '.$attendance->TimeOut);
    
            // handle cross-midnight
            if ($out < $in) {
                $out += 86400; // +1 day in seconds
            }
            // raw hours
            $rawHours = max(($out - $in) / 3600, 0);
    
            // 1) Possibly subtract 1 hour break if shift >= 9 hrs
            $schedule = StaffSchedule::where('StaffID', $attendance->StaffID)
                ->where('ShiftDate', $attendance->Date)
                ->first();
            if ($schedule) {
                $shiftStart = strtotime($schedule->ShiftDate.' '.$schedule->ShiftStart);
                $shiftEnd   = strtotime($schedule->ShiftDate.' '.$schedule->ShiftEnd);
                if ($shiftEnd < $shiftStart) {
                    $shiftEnd += 86400;
                }
                $scheduledHrs = ($shiftEnd - $shiftStart) / 3600;
                if ($scheduledHrs >= 9) {
                    $rawHours = max($rawHours - 1, 0);
                }
    
                // 2) Late minutes (grace of 10 min)
                $graceTime = $shiftStart + (10 * 60); // shiftStart + 10 min
                if ($in > $graceTime) {
                    $attendance->LateMinutes = floor(($in - $graceTime) / 60);
                }
            }
    
            // 3) Determine actual paid HoursWorked (cap at 8)
            $attendance->HoursWorked = min($rawHours, 8);
    
            // 4) NightDiffHours: any portion from 22:00 to 06:00
            $nightStart = strtotime($attendance->Date.' 22:00:00');
            // If staff clocks in before midnight & out after midnight, 06:00 is the next day:
            $nightEnd = strtotime($attendance->Date.' 06:00:00') + 86400; // add 1 day
            $attendance->NightDiffHours = $this->calculateOverlapInHours($in, $out, $nightStart, $nightEnd);
        }
    
        $attendance->save();
        $attendance->load('staff');
    
        return response()->json([
            'message'    => 'Attendance created successfully.',
            'attendance' => $attendance,
        ], 201);
    }
    
    /**
     * Helper to calculate overlap (in hours) between [in,out] and [rangeStart, rangeEnd].
     */
    private function calculateOverlapInHours($in, $out, $rangeStart, $rangeEnd)
    {
        $start = max($in, $rangeStart);
        $end   = min($out, $rangeEnd);
    
        if ($end <= $start) {
            return 0; // no overlap
        }
    
        return ($end - $start) / 3600;
    }
    

    public function clockInOut(Request $request)
    {
        $data = $request->validate([
            'StaffID' => 'required|exists:staff,StaffID',
            'Date'    => 'required|date',
            'TimeIn'  => 'nullable|date_format:H:i',
            'TimeOut' => 'nullable|date_format:H:i|after:TimeIn'
        ]);

        $attendance = Attendance::firstOrNew([
            'StaffID' => $data['StaffID'],
            'Date'    => $data['Date'],
        ]);

        if (isset($data['TimeIn'])) {
            $attendance->TimeIn = $data['TimeIn'];
        }
        if (isset($data['TimeOut'])) {
            $attendance->TimeOut = $data['TimeOut'];
        }

        if ($attendance->TimeIn && $attendance->TimeOut) {
            $in  = strtotime($attendance->Date.' '.$attendance->TimeIn);
            $out = strtotime($attendance->Date.' '.$attendance->TimeOut);
            if ($out < $in) {
                $out += 86400;
            }
            $rawHours = max(($out - $in) / 3600, 0);

            // Subtract 1 hour if scheduled shift >= 9 hrs
            $schedule = StaffSchedule::where('StaffID', $attendance->StaffID)
                ->where('ShiftDate', $attendance->Date)
                ->first();
            if ($schedule) {
                if (in_array($schedule->shiftType, ['morning','mid','evening'])) {
                    $rawHours = max($rawHours - 1, 0);
                } else if ($schedule->shiftType === 'dynamic') {
                    $shiftStart = strtotime($schedule->ShiftDate.' '.$schedule->ShiftStart);
                    $shiftEnd   = strtotime($schedule->ShiftDate.' '.$schedule->ShiftEnd);
                    if ($shiftEnd < $shiftStart) {
                        $shiftEnd += 86400;
                    }
                    $scheduledHrs = ($shiftEnd - $shiftStart) / 3600;
                    if ($scheduledHrs >= 9) {
                        $rawHours = max($rawHours - 1, 0);
                    }
                }
            }

            $attendance->HoursWorked = min($rawHours, 8);
        }

        $attendance->save();

        return response()->json([
            'message'    => 'Attendance updated (capped at 8 paid hours).',
            'attendance' => $attendance,
        ]);
    }

    public function updateAttendance(Request $request, $id)
    {
        $attendance = Attendance::findOrFail($id);

        $data = $request->validate([
            'Date'          => 'required|date',
            'TimeIn'        => 'nullable|date_format:H:i:s',
            'TimeOut'       => 'nullable|date_format:H:i:s|after:TimeIn',
            'HoursWorked'   => 'nullable|numeric|min:0',
            'OvertimeHours' => 'nullable|numeric|min:0',
            'NightDiffHours'=> 'nullable|numeric|min:0',
            'LateMinutes'   => 'nullable|numeric|min:0',// ← Add this
        ]);

        $attendance->update($data);

        return response()->json([
            'message'    => 'Attendance updated.',
            'attendance' => $attendance,
        ]);
    }

    public function attendanceAnalytics(Request $request)
    {
        $from       = $request->query('dateFrom');
        $to         = $request->query('dateTo');
        $branch     = $request->query('branchID');
        $timePeriod = $request->query('timePeriod'); // daily, weekly, monthly, yearly?

        $query = \DB::table('attendances');

        if ($branch && $branch !== 'All Branches') {
            $query->where('BranchID', $branch);
        }

        if ($from && $to) {
            $query->whereBetween('Date', [$from, $to]);
        }

        if ($timePeriod === 'weekly') {
            $query->select(
                \DB::raw("YEAR(Date) as year"),
                \DB::raw("WEEK(Date, 1) as week"),
                \DB::raw("COUNT(*) as totalAttendance")
            )
            ->groupBy('year','week')
            ->orderBy('year')
            ->orderBy('week');
        }
        else if ($timePeriod === 'monthly') {
            $query->select(
                \DB::raw("YEAR(Date) as year"),
                \DB::raw("MONTH(Date) as monthNum"),
                \DB::raw("DATE_FORMAT(Date, '%b %Y') as monthText"),
                \DB::raw("COUNT(*) as totalAttendance")
            )
            ->groupBy('year','monthNum')
            ->orderBy('year')
            ->orderBy('monthNum');
        }
        // add daily, yearly, etc. if needed

        $analytics = $query->get();
        return response()->json($analytics, 200);
    }

    public function destroyAttendance($id)
    {
        $attendance = Attendance::findOrFail($id);
        $attendance->delete();

        return response()->json(['message' => 'Attendance record deleted.']);
    }

    public function attendanceRange($staffID, Request $request)
    {
        $request->validate([
            'start' => 'required|date',
            'end'   => 'required|date|after_or_equal:start'
        ]);

        $start = $request->query('start');
        $end   = $request->query('end');

        $attendances = Attendance::where('StaffID', $staffID)
            ->whereBetween('Date', [$start, $end])
            ->orderBy('Date', 'asc')
            ->get();

        return response()->json($attendances);
    }

    /* ------------------------------------------------------------------
     * STAFF TASKS (REMOTE VERSION)
     * ------------------------------------------------------------------ */

     public function indexTasks()
     {
         if (auth('admin')->check()) {
             $admin = auth('admin')->user();
             // Get an array of branch IDs assigned to the admin
             $assignedBranchIDs = $admin->branches()->pluck('branches.BranchID')->toArray();
     
             // Filter tasks by ensuring the task’s associated staff belong to one of these branches
             $tasks = StaffTask::with('staff')
                 ->whereHas('staff.branches', function ($query) use ($assignedBranchIDs) {
                     $query->whereIn('branches.BranchID', $assignedBranchIDs);
                 })
                 ->orderBy('TaskDate','desc')
                 ->get();
         } elseif (auth('staff')->check()) {
             // For staff logins, return tasks for that specific staff member
             $staff = auth('staff')->user();
             $tasks = StaffTask::with('staff')
                 ->where('StaffID', $staff->StaffID)
                 ->orderBy('TaskDate','desc')
                 ->get();
         } else {
             // Fallback: return all tasks if no admin or staff is logged in
             $tasks = StaffTask::with('staff')->orderBy('TaskDate','desc')->get();
         }
     
         return response()->json($tasks);
     }
     

    public function storeTask(Request $request)
    {
        $data = $request->validate([
            'StaffID'         => 'required|exists:staff,StaffID',
            'TaskDescription' => 'required|string|max:255',
            'TaskDate'        => 'nullable|date',
            'Status'          => 'nullable|string|max:50',
        ]);

        $task = StaffTask::create($data);
        $taskWithStaff = StaffTask::with(['staff' => function($query) {
            $query->select('StaffID', 'FullName');
        }])->find($task->TaskID);

        return response()->json([
            'message' => 'Staff task created.',
            'task'    => $taskWithStaff
        ], 201);
    }

    public function updateTask(Request $request, $id)
    {
        $task = StaffTask::findOrFail($id);

        $data = $request->validate([
            'TaskDescription' => 'sometimes|string|max:255',
            'TaskDate'        => 'sometimes|date',
            'Status'          => 'required|string|in:Pending,InProgress,Completed',
        ]);

        $task->update($data);

        $updatedTask = StaffTask::with(['staff' => function($query) {
            $query->select('StaffID', 'FullName');
        }])->find($task->TaskID);

        return response()->json([
            'message' => 'Staff task updated.',
            'task'    => $updatedTask
        ]);
    }

    public function markTaskCompleted($id)
    {
        $task = StaffTask::findOrFail($id);
        $task->update(['Status' => 'Completed']);

        return response()->json([
            'message' => 'Task completed.',
            'task'    => $task,
        ]);
    }

    /**
     * DELETE TASK (REMOTE) [Only ONE function!]
     */
    public function destroyTask($id)
    {
        $task = StaffTask::findOrFail($id);
        $task->delete();
        return response()->json(['message' => 'Task deleted.']);
    }

    public function performance()
    {
        $performance = \DB::table('staff_tasks')
            ->select(
                'staff.StaffID',
                'staff.FullName',
                \DB::raw('COUNT(*) as tasksCompleted')
            )
            ->join('staff', 'staff_tasks.StaffID', '=', 'staff.StaffID')
            ->where('staff_tasks.Status', 'Completed')
            ->groupBy('staff.StaffID', 'staff.FullName')
            ->get();

        return response()->json($performance, 200);
    }

    /* ------------------------------------------------------------------
     * STAFF SCHEDULE (REMOTE VERSION)
     * ------------------------------------------------------------------ */

    // In StaffController.php
    public function indexSchedules(Request $request)
    {
        // 1) Grab the logged-in staff (from the 'staff' guard)
        $staff = auth('staff')->user();
    
        if ($staff) {
            // 2) Get all branch IDs from the pivot table for that staff
            //    i.e. staff->branches is many-to-many
            $branchIds = $staff->branches()->pluck('branches.BranchID');
    
            // 3) Fetch all schedules where the schedule’s staff
            //    belongs to any of these branches
            $schedules = StaffSchedule::with(['staff' => function($query) {
                    $query->select('StaffID', 'FullName');
                }])
                ->whereHas('staff.branches', function($query) use ($branchIds) {
                    $query->whereIn('branch_staff.BranchID', $branchIds);
                })
                ->orderBy('ShiftDate', 'desc')
                ->get();
        } else {
            // If for some reason no user is logged in, return all schedules
            // (or you could return an empty collection if that’s your preference)
            $schedules = StaffSchedule::with(['staff' => function($query) {
                $query->select('StaffID', 'FullName');
            }])
            ->orderBy('ShiftDate', 'desc')
            ->get();
        }
    
        return response()->json($schedules);
    }
    

    public function createSchedule()
    {
        $staff = Staff::orderBy('FullName','asc')->get();
        return response()->json(['staff' => $staff]);
    }

    public function storeSchedule(Request $request)
    {
        $today = now()->format('Y-m-d');

        $data = $request->validate([
            'StaffID'   => 'required|exists:staff,StaffID',
            'dateFrom'  => "required|date|after_or_equal:$today",
            'dateTo'    => 'required|date|after_or_equal:dateFrom',
            'shiftType' => 'required|string|in:morning,mid,evening,dynamic',
            'startTime' => 'nullable|date_format:H:i',
            'endTime'   => 'nullable|date_format:H:i|after:startTime'
        ]);

        $shiftStart = null;
        $shiftEnd   = null;
        switch ($data['shiftType']) {
            case 'morning':
                $shiftStart = '05:30';
                $shiftEnd   = '14:30';
                break;
            case 'mid':
                $shiftStart = '10:00';
                $shiftEnd   = '19:00';
                break;
            case 'evening':
                $shiftStart = '15:00';
                $shiftEnd   = '23:59';
                break;
            case 'dynamic':
                $shiftStart = $data['startTime'];
                $shiftEnd   = $data['endTime'];
                break;
        }

        $period = \Carbon\CarbonPeriod::create($data['dateFrom'], $data['dateTo']);
        $records = [];
        foreach ($period as $date) {
            if ($date->isBefore(now()->startOfDay())) {
                continue;
            }
            $records[] = [
                'StaffID'    => $data['StaffID'],
                'ShiftDate'  => $date->format('Y-m-d'),
                'ShiftStart' => $shiftStart,
                'ShiftEnd'   => $shiftEnd,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        StaffSchedule::insert($records);

        $created = StaffSchedule::with('staff')
            ->where('StaffID', $data['StaffID'])
            ->whereBetween('ShiftDate', [$data['dateFrom'], $data['dateTo']])
            ->orderBy('ShiftDate','asc')
            ->get();

        return response()->json([
            'message'   => 'Schedules created',
            'schedules' => $created,
        ], 201);
    }

    public function scheduleRange($staffID, Request $request)
    {
        $request->validate([
            'start' => 'required|date',
            'end'   => 'required|date|after_or_equal:start'
        ]);

        $start = $request->query('start');
        $end   = $request->query('end');

        $schedules = StaffSchedule::where('StaffID', $staffID)
            ->whereBetween('ShiftDate', [$start, $end])
            ->orderBy('ShiftDate')
            ->get();

        return response()->json($schedules);
    }

    public function bulkStoreSchedules(Request $request)
    {
        $today = now()->format('Y-m-d');

        $data = $request->validate([
            'StaffID'   => 'required|exists:staff,StaffID',
            'dateFrom'  => "required|date|after_or_equal:$today",
            'dateTo'    => 'required|date|after_or_equal:dateFrom',
            'shiftType' => 'required|string|in:morning,mid,evening,dynamic',
            'startTime' => 'nullable|date_format:H:i',
            'endTime'   => 'nullable|date_format:H:i|after:startTime',
        ]);

        $shiftStart = null;
        $shiftEnd   = null;
        switch ($data['shiftType']) {
            case 'morning':
                $shiftStart = '05:30';
                $shiftEnd   = '14:30';
                break;
            case 'mid':
                $shiftStart = '10:00';
                $shiftEnd   = '19:00';
                break;
            case 'evening':
                $shiftStart = '15:00';
                $shiftEnd   = '23:59';
                break;
            case 'dynamic':
                $shiftStart = $data['startTime'];
                $shiftEnd   = $data['endTime'];
                break;
        }

        $period = \Carbon\CarbonPeriod::create($data['dateFrom'], $data['dateTo']);
        $records = [];
        foreach ($period as $date) {
            $records[] = [
                'StaffID'    => $data['StaffID'],
                'ShiftDate'  => $date->format('Y-m-d'),
                'ShiftStart' => $shiftStart,
                'ShiftEnd'   => $shiftEnd,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        StaffSchedule::insert($records);

        $created = StaffSchedule::with('staff')
            ->where('StaffID', $data['StaffID'])
            ->whereBetween('ShiftDate', [$data['dateFrom'], $data['dateTo']])
            ->orderBy('ShiftDate','asc')
            ->get();

        return response()->json([
            'message'   => 'Schedules created',
            'schedules' => $created,
        ]);
    }

    public function bulkStoreCustom(Request $request)
    {
        $data = $request->validate([
            'StaffID'       => 'required|exists:staff,StaffID',
            'shiftType'     => 'required|string|in:morning,mid,evening,dynamic',
            'startTime'     => 'nullable|date_format:H:i',
            'endTime'       => 'nullable|date_format:H:i|after:startTime',
            'selectedDates' => 'required|array|min:1',
            'selectedDates.*' => 'date_format:Y-m-d',
        ]);
    
        // Decide default shift times if not dynamic
        $shiftStart = null;
        $shiftEnd   = null;
        switch ($data['shiftType']) {
            case 'morning':
                $shiftStart = '05:30';
                $shiftEnd   = '14:30';
                break;
            case 'mid':
                $shiftStart = '10:00';
                $shiftEnd   = '19:00';
                break;
            case 'evening':
                $shiftStart = '15:00';
                $shiftEnd   = '23:59';
                break;
            case 'dynamic':
                $shiftStart = $data['startTime'];
                $shiftEnd   = $data['endTime'];
                break;
        }
    
        $createdRecords = [];
    
        foreach ($data['selectedDates'] as $date) {
            $sched = StaffSchedule::create([
                'StaffID'    => $data['StaffID'],
                'ShiftDate'  => $date,
                'ShiftStart' => $shiftStart,
                'ShiftEnd'   => $shiftEnd,
                // Now store the actual shiftType:
                'ShiftType'  => $data['shiftType'],
            ]);
    
            $createdRecords[] = $sched;
        }
    
        return response()->json([
            'message'   => 'Custom schedules created successfully.',
            'schedules' => $createdRecords,
        ], 201);
    }
    

    public function updateSchedule(Request $request, $id)
    {
        $schedule = StaffSchedule::findOrFail($id);
    
        $data = $request->validate([
            'StaffID'      => 'required|exists:staff,StaffID',
            'ShiftDate'    => 'required|date',
            'ShiftType'    => 'required|string|in:morning,mid,evening,dynamic',
            'ShiftStart'   => 'nullable|date_format:H:i',
            'ShiftEnd'     => 'nullable|date_format:H:i|after:ShiftStart',
            'RoleOverride' => 'nullable|string|max:50',
        ]);
        
        switch ($data['ShiftType']) {
            case 'morning':
                $data['ShiftStart'] = '05:30';
                $data['ShiftEnd']   = '14:30';
                break;
            case 'mid':
                $data['ShiftStart'] = '10:00';
                $data['ShiftEnd']   = '19:00';
                break;
            case 'evening':
                $data['ShiftStart'] = '15:00';
                $data['ShiftEnd']   = '23:59';
                break;
        }
        
        $schedule->update($data);
    
        return response()->json([
            'message'  => 'Schedule updated.',
            'schedule' => $schedule,
        ]);
    }
    

    public function destroySchedule($id)
    {
        $schedule = StaffSchedule::findOrFail($id);
        $schedule->delete();
        return response()->json(['message' => 'Schedule deleted.']);
    }

    /* ------------------------------------------------------------------
     * PAYROLL & BONUS (REMOTE VERSION)
     * ------------------------------------------------------------------ */

    public function createPayroll()
    {
        $staff = Staff::orderBy('FullName','asc')->get();
        return response()->json(['staff' => $staff]);
    }

    public function storePayroll(Request $request)
    {
        $data = $request->validate([
            'StaffID'       => 'required|exists:staff,StaffID',
            'StartDate'     => 'required|date',
            'EndDate'       => 'required|date|after_or_equal:StartDate',
            'Deductions'    => 'nullable|numeric|min:0',
            'CashAdvance'   => 'nullable|numeric|min:0',
            'GeneratedDate' => 'nullable|date',
            'Status'        => 'nullable|string|max:50',
        ]);
    
        // 1) Fetch staff for Hourly/Overtime Rate
        $staff = Staff::findOrFail($data['StaffID']);
        $hourlyRate    = $staff->HourlyRate;    // e.g. dailyRate / 8
        $overtimeRate  = $staff->OvertimeRate;  // e.g. hourlyRate * 1.25
        $nightDiffRate = $hourlyRate * 0.10;    // 10% of hourly
    
        // 2) Gather attendance in date range
        $attendances = Attendance::where('StaffID', $staff->StaffID)
            ->whereBetween('Date', [$data['StartDate'], $data['EndDate']])
            ->get();
    
        if ($attendances->isEmpty()) {
            return response()->json([
                'message' => 'No attendance found in the specified date range.',
            ], 422);
        }
    
        // 3) Accumulate totals
        $totalRegHours     = 0;
        $totalOTHours      = 0;
        $totalNightDiffHrs = 0;
        $totalLateMins     = 0;
    
        foreach ($attendances as $att) {
            $hrs = $att->HoursWorked ?: 0;
            $totalRegHours += min($hrs, 8);
    
            $possibleOT = max($hrs - 8, 0);
            $approvedOT = $att->OvertimeHours ?: 0;
            $actualOT   = min($approvedOT, $possibleOT);
            $totalOTHours += $actualOT;
    
            $totalNightDiffHrs += ($att->NightDiffHours ?: 0);
            $totalLateMins     += ($att->LateMinutes    ?: 0);
        }
    
        // 4) Compute pay
        $regularPay   = $totalRegHours * $hourlyRate;
        $overtimePay  = $totalOTHours  * $overtimeRate;
        $nightDiffPay = $totalNightDiffHrs * $nightDiffRate;
    
        $grossPay = $regularPay + $overtimePay + $nightDiffPay;
    
        // 5) Combine user Deductions + late penalty + cash advance
        $manualDeductions = $data['Deductions'] ?? 0;
        $cashAdvance      = $data['CashAdvance'] ?? 0;
        $latePenalty      = $totalLateMins;  // e.g. 1 peso/min
    
        // The final "actualDeductions" includes late penalty
        $actualDeductions = $manualDeductions + $latePenalty;
    
        // Then total "combined" includes cash advance too
        $combinedDeductions = $actualDeductions + $cashAdvance;
    
        // 6) Net pay
        $netPay = $grossPay - $combinedDeductions;
    
        // 7) Store payroll
        $payroll = Payroll::create([
            'StaffID'       => $staff->StaffID,
            'StartDate'     => $data['StartDate'],
            'EndDate'       => $data['EndDate'],
            'GrossPay'      => $grossPay,
            // Store final total in Deductions:
            'Deductions'    => $actualDeductions, // includes manual + late penalty
            'CashAdvance'   => $cashAdvance,
            'NetPay'        => $netPay,
            'GeneratedDate' => $data['GeneratedDate'] ?? now(),
            'Status'        => $data['Status'] ?? 'Pending',
        ]);
    
        // Attach staff & attendance for the response
        $payroll->load('staff');
    
        // re-fetch attendance for display
        $attendances = Attendance::where('StaffID', $payroll->StaffID)
            ->whereBetween('Date', [$payroll->StartDate, $payroll->EndDate])
            ->get();
    
        $payroll->setRelation('computed_attendances', $attendances);
    
        return response()->json([
            'message' => 'Payroll created!',
            'payroll' => $payroll,
        ], 201);
    }
    

    public function indexPayroll()
    {
        // 1) Fetch payrolls with staff, sorted by StartDate
        $payrolls = Payroll::with('staff')->orderBy('StartDate','desc')->get();
    
        // 2) For each payroll row, do a custom fetch of attendance
        foreach ($payrolls as $payroll) {
            // Query attendance by (StaffID) + [StartDate..EndDate]
            $computedAttendances = Attendance::where('StaffID', $payroll->StaffID)
                ->whereBetween('Date', [$payroll->StartDate, $payroll->EndDate])
                ->get();
    
            // 3) For each attendance, do a "Staff + Date" schedule lookup
            foreach ($computedAttendances as $att) {
                $sched = StaffSchedule::where('StaffID', $att->StaffID)
                    ->where('ShiftDate', $att->Date)
                    ->first();
                $att->schedule = $sched;
            }
    
            // 5) Attach those computed attendances to the payroll object
            $payroll->computed_attendances = $computedAttendances;
        }
    
        // 6) Return the final JSON
        return response()->json($payrolls);
    }    

    public function updatePayroll(Request $request, $id)
    {
        // 1) Find existing
        $payroll = Payroll::findOrFail($id);
    
        // 2) Validate partial fields
        $data = $request->validate([
            'StartDate'     => 'required|date',
            'EndDate'       => 'required|date|after_or_equal:StartDate',
            'Deductions'    => 'nullable|numeric|min:0',
            'CashAdvance'   => 'nullable|numeric|min:0',
            'GeneratedDate' => 'nullable|date',
            'Status'        => 'nullable|string|max:50',
            'GrossPay'      => 'nullable|numeric|min:0',
            'NetPay'        => 'nullable|numeric|min:0',
            'IgnoreLate'    => 'nullable|boolean',
        ]);
    
        // 3) Possibly keep the staff the same
        $staff = $payroll->staff;
        if (!$staff) {
            return response()->json(['message' => 'Associated staff not found.'], 422);
        }
    
        // 4) Recalc partial fields from attendance (if desired)
        $hourlyRate    = $staff->HourlyRate;
        $overtimeRate  = $staff->OvertimeRate;
        $nightDiffRate = $hourlyRate * 0.10;
    
        $attendances = Attendance::where('StaffID', $staff->StaffID)
            ->whereBetween('Date', [$data['StartDate'], $data['EndDate']])
            ->get();
    
        if ($attendances->isEmpty()) {
            return response()->json([
                'message' => 'No attendance found in the specified date range.',
            ], 422);
        }
    
        $totalRegHours     = 0;
        $totalOTHours      = 0;
        $totalNightDiffHrs = 0;
        $totalLateMins     = 0;
    
        foreach ($attendances as $att) {
            $hrs = $att->HoursWorked ?: 0;
            $totalRegHours += min($hrs, 8);
    
            $possibleOT = max($hrs - 8, 0);
            $approvedOT = $att->OvertimeHours ?: 0;
            $actualOT   = min($approvedOT, $possibleOT);
            $totalOTHours += $actualOT;
    
            $totalNightDiffHrs += ($att->NightDiffHours ?: 0);
            $totalLateMins     += ($att->LateMinutes    ?: 0);
        }
    
        // 4a) If user did NOT override GrossPay, recalc
        if (!isset($data['GrossPay'])) {
            $regularPay   = $totalRegHours * $hourlyRate;
            $overtimePay  = $totalOTHours  * $overtimeRate;
            $nightDiffPay = $totalNightDiffHrs * $nightDiffRate;
            $grossPay     = $regularPay + $overtimePay + $nightDiffPay;
        } else {
            $grossPay = floatval($data['GrossPay']);
        }
    
        // 4b) If user wants to ignore late penalty, we skip adding it
        $latePenalty = ($data['IgnoreLate'] ?? false) ? 0 : $totalLateMins;
    
        // combine manual + penalty => actualDeductions
        $manualDeductions = $data['Deductions'] ?? 0;
        $actualDeductions = $manualDeductions + $latePenalty;
    
        $cashAdvance = $data['CashAdvance'] ?? 0;
        $combinedDeductions = $actualDeductions + $cashAdvance;
    
        // 4c) If user did NOT override NetPay, do the auto-calc
        if (!isset($data['NetPay'])) {
            $netPay = $grossPay - $combinedDeductions;
        } else {
            $netPay = floatval($data['NetPay']);
        }
    
        // 5) Update existing payroll
        $payroll->update([
            'StartDate'     => $data['StartDate'],
            'EndDate'       => $data['EndDate'],
            'GrossPay'      => $grossPay,
    
            // store the sum of manual + late penalty in Deductions
            'Deductions'    => $actualDeductions,
            'CashAdvance'   => $cashAdvance,
            'NetPay'        => $netPay,
            'GeneratedDate' => $data['GeneratedDate'] ?? now(),
            'Status'        => $data['Status'] ?? 'Pending',
        ]);
    
        // You could also store $payroll->LatePenalty = $latePenalty; if you have that column
    
        // Attach computed attendances
        $payroll->setRelation('computed_attendances', $attendances);
        $payroll->load('staff');
    
        // Return final JSON
        return response()->json([
            'message' => 'Payroll updated with partial overrides.',
            'payroll' => $payroll,
        ]);
    }
    

    public function destroyPayroll($id)
    {
        $payroll = Payroll::findOrFail($id);
        $payroll->delete();
        return response()->json(['message' => 'Payroll deleted.']);
    }

    public function createBonus()
    {
        $staff = Staff::orderBy('FullName','asc')->get();
        return response()->json(['staff' => $staff]);
    }

    public function storeBonus(Request $request)
    {
        $data = $request->validate([
            'StaffID'     => 'required|exists:staff,StaffID',
            'BonusAmount' => 'required|numeric|min:0',
            'BonusDate'   => 'required|date',
            'Reason'      => 'nullable|string|max:255',
        ]);

        $bonus = Bonus::create($data);

        return response()->json([
            'message' => 'Bonus awarded successfully.',
            'bonus'   => $bonus,
        ], 201);
    }
}
