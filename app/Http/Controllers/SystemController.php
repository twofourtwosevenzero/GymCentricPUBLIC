<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class SystemController extends Controller
{
    /**
     * Return system logs in JSON (supports optional filtering).
     */
    public function indexLogs(Request $request)
    {
        $query = Activity::orderBy('created_at', 'desc');

        // Optional: Filter by log_name
        if ($request->filled('log_name')) {
            $query->where('log_name', $request->log_name);
        }

        // Optional: Filter by exact date (yyyy-mm-dd)
        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        // **New**: Filter by branch if provided and not "All Branches"
        // (assuming you store branch_id in properties->branch_id)
        if ($request->filled('branch') && $request->branch !== 'All Branches') {
            $branchVal = $request->branch;
            // if your DB is MySQL 5.7+ or Postgres, you can do:
            $query->where('properties->branch_id', $branchVal);

            // Alternatively, for older MySQL or complex logic, you might do
            // $query->whereJsonContains('properties->branch_id', $branchVal);
        }

        $logs = $query->get();

        // Convert each activity to the shape your React table wants
        $logsArray = $logs->map(function($activity) {
            // We'll retrieve the branch_id from properties, if present
            $props = $activity->properties->toArray();
            $branchId = $props['branch_id'] ?? 'N/A';

            return [
                'logId'     => 'LOG-'.$activity->id,
                'timestamp' => $activity->created_at->format('Y-m-d H:i:s'),
                'user'      => optional($activity->causer)->FullName ?? 'System',
                'actionDesc'=> $activity->description,
                'module'    => $activity->log_name,
                'logType'   => $activity->event ?? 'informational',
                'details'   => json_encode($props),
                'ipAddress' => $props['ip'] ?? 'N/A',
                'branch'    => $branchId,  // passing branch to the front end
            ];
        });

        return response()->json(['logs' => $logsArray]);
    }

    /**
     * Delete a single log entry (return JSON instead of redirect).
     */
    public function destroyLog($id)
    {
        $this->authorize('delete-logs');  // Only owners or specific roles

        // If you're storing logs in Spatie's default 'activity_log' table,
        // you might do: $log = Activity::findOrFail($id);
        // Or if you have SystemLog as a separate model:
        // $log = SystemLog::findOrFail($id);

        // Example if you store them in SystemLog:
        $log = \App\Models\SystemLog::findOrFail($id);
        $log->delete();

        return response()->json([
            'success' => true,
            'message' => 'Log entry removed.'
        ]);
    }

    /**
     * Bulk delete logs (still returning JSON).
     */
    public function destroyLogs(Request $request)
    {
        $this->authorize('delete-logs');

        $request->validate([
            'logIds'   => 'required|array|min:1',
            'logIds.*' => 'exists:system_logs,id',
        ]);

        \App\Models\SystemLog::whereIn('id', $request->logIds)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Selected logs have been removed.'
        ]);
    }

    /**
     * Display the reports page with data for analytics (if you still want Inertia).
     */
    public function generateReports()
    {
        // Example data
        $membershipCount = \App\Models\Member::count();
        $attendanceStats = \App\Models\Attendance::selectRaw('date(created_at) as date, count(*) as count')
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        return Inertia::render('System/Reports/Index', [
            'membershipCount' => $membershipCount,
            'attendanceStats' => $attendanceStats,
        ]);
    }

    public function systemMetrics()
    {
        // Just example
        $logsCount = \DB::table('system_logs')->count();
        $notificationsCount = \DB::table('notifications')->count();

        return response()->json([
            'logsCount' => $logsCount,
            'notificationsCount' => $notificationsCount,
        ], 200);
    }
}
