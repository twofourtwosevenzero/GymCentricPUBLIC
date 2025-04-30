<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\QrCodeController;


/*
|--------------------------------------------------------------------------
| Member Login Route
|--------------------------------------------------------------------------
*/
Route::get('/member/login', function () {
    return Inertia::render('Auth/MemberLogin');
})->name('member.login');
/*
|--------------------------------------------------------------------------
| Root: Redirect to log-in page if not log-in but trying to put redirection url
|--------------------------------------------------------------------------
*/

Route::get('/login', function () {
    return redirect()->route('root');
})->name('login');

/*
|---------------------------------------------------------------------------
| Root: Redirect to Correct Dashboard if Logged In
|---------------------------------------------------------------------------
*/
Route::get('/', function() {
    if (auth('owner')->check()) {
        return redirect()->route('owner.dashboard');
    } elseif (auth('admin')->check()) {
        return redirect()->route('admin.dashboard');
    } elseif (auth('staff')->check()) {
        return redirect()->route('staff.dashboard');
    }
    // If no one is logged in, show a public landing or Blade 'welcome'
    return Inertia::render('LandingPage'); // or Inertia::render('Public/Welcome')
})->name('root');

use App\Http\Controllers\ProfileController;
Route::middleware('auth:owner,admin,staff')->get('/profile', [ProfileController::class, 'show']);

/*
|---------------------------------------------------------------------------
| Owner Dashboard
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\OwnerDashboardController;
use App\Http\Controllers\AuthController;

Route::middleware(['auth:owner'])->group(function () {
    Route::get('/owner/dashboard', [OwnerDashboardController::class, 'index'])
        ->name('owner.dashboard');

    Route::get('/owner/dashboard-metrics', [OwnerDashboardController::class, 'metrics'])
        ->name('dashboard.metrics');

    Route::get('/owner/member-metrics', [OwnerDashboardController::class, 'memberMetrics'])
        ->name('owner.dashboard.member-metrics');
});

// Add a route for checking authentication status
Route::get('/api/auth/check', [AuthController::class, 'checkAuth']);

/*
|---------------------------------------------------------------------------
| Admin Dashboard
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\AdminDashboardController;

Route::middleware('auth:admin')->prefix('admin')->group(function () {
    Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('admin.dashboard');
    Route::get('users', [AdminDashboardController::class, 'users'])->name('admin.users');
    Route::get('payments', [AdminDashboardController::class, 'payments'])->name('admin.payments');
    Route::get('system-logs', [AdminDashboardController::class, 'systemLogs'])->name('admin.systemLogs');
    Route::get('notifications', [AdminDashboardController::class, 'notifications'])->name('admin.notifications');
    Route::get('settings', [AdminDashboardController::class, 'settings'])->name('admin.settings');

    // NEW: admin dashboard metrics
    Route::get('dashboard-metrics', [AdminDashboardController::class, 'metrics'])
         ->name('admin.dashboard.metrics');
         
    // Admin branch routes - used by the branch filters
    Route::get('my-branches', [AdminController::class, 'myBranches'])->name('admin.my-branches');
});

use App\Http\Controllers\AdminController;

// If you only want Owners to create new Admins:
Route::middleware('multiGuard:owner,admin')->group(function() {
    Route::post('/admin', [AdminController::class, 'store'])->name('admin.store');
});


/*
|---------------------------------------------------------------------------
| Staff Dashboard
|---------------------------------------------------------------------------
|
| If you want ONLY "staff" to access these, keep 'auth:staff'.
| But if you want owners/admin to also see them, you can do multiGuard:owner,admin,staff.
| For a pure staff scenario, revert back to auth:staff only.
|
*/
use App\Http\Controllers\StaffDashboardController;

// Example: let staff routes be accessible by staff, admin, or owner:
Route::middleware('multiGuard:owner,admin,staff')->prefix('staff')->group(function () {
    Route::get('dashboard', [StaffDashboardController::class, 'index'])->name('staff.dashboard');

    // If you need a route like /staff/branches:
    Route::get('branches', [StaffDashboardController::class, 'branches'])->name('staff.branches');

    Route::get('tasks', [StaffDashboardController::class, 'tasks'])->name('staff.tasks');
    Route::get('attendance', [StaffDashboardController::class, 'attendance'])->name('staff.attendance');
    Route::get('notifications', [StaffDashboardController::class, 'notifications'])->name('staff.notifications');
    Route::get('system-logs', [StaffDashboardController::class, 'systemLogs'])->name('staff.systemLogs');
});

/*
|---------------------------------------------------------------------------
| Staff Authentication Routes
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\StaffAuthController;

Route::get('/staff/login', [StaffAuthController::class, 'showLoginForm'])->name('staff.login');
Route::post('/staff/login', [StaffAuthController::class, 'login'])->name('staff.login.post');
Route::post('/staff/logout', [StaffAuthController::class, 'logout'])->name('staff.logout');

/*
|---------------------------------------------------------------------------
| Admin Authentication Routes
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\AdminAuthController;

Route::get('/admin/login', [AdminAuthController::class, 'showLoginForm'])->name('admin.login');
Route::post('/admin/login', [AdminAuthController::class, 'login'])->name('admin.login.post');
Route::post('/admin/logout', [AdminAuthController::class, 'logout'])->name('admin.logout');
Route::get('/admin/info', [AdminAuthController::class, 'getAdminInfo'])->name('admin.info');

/*
|---------------------------------------------------------------------------
| Owner Authentication Routes
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\OwnerAuthController;

Route::get('/owner/login', [OwnerAuthController::class, 'showLoginForm'])->name('owner.login');
Route::post('/owner/login', [OwnerAuthController::class, 'login'])->name('owner.login.post');
Route::post('/owner/logout', [OwnerAuthController::class, 'logout'])->name('owner.logout');

/*
|---------------------------------------------------------------------------
| Profile Update Routes
|---------------------------------------------------------------------------
*/
// web.php (or api.php)
Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');


/*
|---------------------------------------------------------------------------
| PaymentController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\PaymentController;

Route::prefix('payments')->group(function() {
    // Example usage of multiGuard for various roles
    Route::get('setup/paymongo', [PaymentController::class, 'viewPayMongoCredentials'])
        ->middleware('auth:owner')
        ->name('payments.setup.paymongo');

    Route::post('setup/paymongo', [PaymentController::class, 'updatePayMongoCredentials'])
        ->middleware('auth:owner')
        ->name('payments.setup.paymongo.update');

    Route::get('setup/fee-rules', [PaymentController::class, 'viewFeeRules'])
        ->middleware('multiGuard:owner,admin')
        ->name('payments.setup.feeRules');
    Route::post('setup/fee-rules', [PaymentController::class, 'updateFeeRules'])
        ->middleware('multiGuard:owner,admin')
        ->name('payments.setup.feeRules.update');

    Route::get('setup/methods', [PaymentController::class, 'indexPaymentMethods'])
        ->middleware('multiGuard:owner,admin')
        ->name('payments.setup.methods');
    Route::post('setup/methods/toggle', [PaymentController::class, 'togglePaymentMethod'])
        ->middleware('multiGuard:owner,admin')
        ->name('payments.setup.methods.toggle');

    // Payment transactions
    Route::get('transactions', [PaymentController::class, 'indexTransactions'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.transactions.index');
    Route::get('transactions/export', [PaymentController::class, 'exportTransactions'])
        ->middleware('multiGuard:owner,admin')
        ->name('payments.transactions.export');

    // Refunds
    Route::post('{paymentId}/refund/initiate', [PaymentController::class, 'initiateRefund'])
        ->middleware('multiGuard:owner,admin')
        ->name('payments.refund.initiate');
    Route::post('{paymentId}/refund/approve', [PaymentController::class, 'approveRefund'])
        ->middleware('multiGuard:owner,admin')
        ->name('payments.refund.approve');

    // Payment CRUD
    Route::get('create', [PaymentController::class, 'create'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.create');
    Route::post('/', [PaymentController::class, 'store'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.store');
    Route::get('/', [PaymentController::class, 'index'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.index');
    Route::get('{id}', [PaymentController::class, 'show'])->name('payments.show');

    Route::get('{id}/edit', [PaymentController::class, 'edit'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.edit');
    Route::put('{id}', [PaymentController::class, 'update'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.update');
        
    Route::patch('/{id}/note', [PaymentController::class, 'updateNote']);

    Route::delete('{id}', [PaymentController::class, 'destroy'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.destroy');

    // Partial / Multiple
    Route::get('partial/create', [PaymentController::class, 'createPartialPayment'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.partial.create');
    Route::post('partial', [PaymentController::class, 'storePartialPayment'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.partial.store');
    Route::post('invoices/{invoiceId}/link', [PaymentController::class, 'linkPaymentsToInvoice'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('payments.link.invoices');
});

/*
|---------------------------------------------------------------------------
| InvoiceController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\InvoiceController;

Route::prefix('invoices')->middleware('multiGuard:owner,admin,staff')->group(function() {
    Route::get('/', [InvoiceController::class, 'index'])->name('invoices.index');
    Route::post('/', [InvoiceController::class, 'store'])->name('invoices.store');
    Route::get('{id}', [InvoiceController::class, 'show'])->name('invoices.show');
    Route::put('{id}', [InvoiceController::class, 'update'])->name('invoices.update');
    Route::delete('{id}/delete', [InvoiceController::class, 'destroy'])
         ->name('invoices.delete');
});

/*
|---------------------------------------------------------------------------
| NotificationController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\NotificationController;

Route::prefix('notifications')->group(function() {
    // Channels
    Route::get('channels/semaphore', [NotificationController::class, 'viewSemaphore'])
        ->middleware('auth:owner')
        ->name('notifications.channels.semaphore');
    Route::post('channels/semaphore', [NotificationController::class, 'updateSemaphore'])
        ->middleware('auth:owner')
        ->name('notifications.channels.semaphore.update');

    Route::get('channels/sms-limit', [NotificationController::class, 'viewSMSLimit'])
        ->middleware('multiGuard:owner,admin')
        ->name('notifications.channels.smsLimit');
    Route::post('channels/sms-limit', [NotificationController::class, 'updateSMSLimit'])
        ->middleware('multiGuard:owner,admin')
        ->name('notifications.channels.smsLimit.update');

    Route::get('channels/mailjet', [NotificationController::class, 'viewMailjet'])
        ->middleware('auth:owner')
        ->name('notifications.channels.mailjet');
    Route::post('channels/mailjet', [NotificationController::class, 'updateMailjet'])
        ->middleware('auth:owner')
        ->name('notifications.channels.mailjet.update');

    // Sending notifications
    Route::post('send/bulk-sms', [NotificationController::class, 'sendBulkSMS'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.send.bulkSMS');
    Route::post('send/bulk-email', [NotificationController::class, 'sendBulkEmail'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.send.bulkEmail');
    Route::post('send/ad-hoc', [NotificationController::class, 'adHocNotification'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.send.adHoc');
    Route::get('sms-credits', [NotificationController::class, 'viewSMSCredits'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.smsCredits');
    Route::get('mailjet/advanced', [NotificationController::class, 'advancedMailjet'])
        ->middleware('auth:owner')
        ->name('notifications.mailjet.advanced');

    // Announcements
    Route::get('announcements', [NotificationController::class, 'indexAnnouncements'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.announcements.index');
    Route::post('announcements', [NotificationController::class, 'storeAnnouncement'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.announcements.store');
    Route::put('announcements/{id}', [NotificationController::class, 'updateAnnouncement'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.announcements.update');
    Route::delete('announcements/{id}', [NotificationController::class, 'destroyAnnouncement'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.announcements.destroy');

    // Send Notification to Staff
    Route::post('send-staff', [NotificationController::class, 'sendStaffNotification'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.send.staff');
    Route::get('staff', [NotificationController::class, 'getStaffNotifications'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.staff');

    // Templates
    Route::get('templates', [NotificationController::class, 'indexTemplates'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.templates.index');
    Route::post('templates', [NotificationController::class, 'storeTemplate'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.templates.store');
    Route::get('templates/{id}/edit', [NotificationController::class, 'editTemplate'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.templates.edit');
    Route::post('templates/{id}/update', [NotificationController::class, 'updateTemplate'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.templates.update');
    Route::post('templates/{id}/approve', [NotificationController::class, 'approveTemplate'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('notifications.templates.approve');
});

Route::get('/notifications/send-expiring-reminder', [NotificationController::class, 'sendExpiringMembershipReminder'])
    ->middleware('auth:owner') // or any guard you prefer
    ->name('notifications.sendExpiringReminder');

Route::post('/notifications/send-expiring-reminder-selected', [NotificationController::class, 'sendExpiringMembershipReminderForSelected'])
    ->middleware('auth:owner,admin,staff')
    ->name('notifications.sendExpiringReminderSelected');

Route::get('/notifications/mailjet-activity-logs', [NotificationController::class, 'getMailjetActivityLogs'])
    ->middleware('multiGuard:owner,admin,staff')
    ->name('notifications.mailjet.activityLogs');

// New route for Semaphore Activity Logs
Route::get('/notifications/semaphore-activity-logs', [NotificationController::class, 'getSemaphoreActivityLogs'])
    ->middleware('multiGuard:owner,admin,staff')
    ->name('notifications.semaphore.activityLogs');

Route::post('/notifications/send-mailjet-template', [NotificationController::class, 'sendMailjetTemplate'])
    ->middleware('auth:owner,admin,staff')
    ->name('notifications.sendMailjetTemplate');

Route::post('/notifications/send-semaphore-sms', [NotificationController::class, 'sendSemaphoreSMS'])
    ->middleware('auth:owner,admin,staff');

Route::post('/notifications/notify-coach-booking-mailjet', [NotificationController::class, 'notifyCoachOfBookingMailjet'])
    ->middleware('multiGuard:owner,admin,staff');

Route::post('/notifications/notify-member-booking-mailjet', [NotificationController::class, 'notifyMemberOfBookingMailjet'])
    ->middleware('multiGuard:owner,admin,staff');

/*
|---------------------------------------------------------------------------
| MembershipController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\MembershipController;

Route::get('/membership/latest-card-number', [MembershipController::class, 'getLatestCardNumber']);

Route::prefix('membership')->group(function() {

    // 1) Members
    Route::get('members', [MembershipController::class, 'apiIndex'])
        ->name('membership.members.apiIndex');
    Route::post('members', [MembershipController::class, 'apiStoreMember'])
        ->name('membership.members.apiStoreMember');
    Route::put('members/{id}', [MembershipController::class, 'apiUpdateMember'])
        ->name('membership.members.apiUpdateMember');
    Route::delete('members/{id}', [MembershipController::class, 'apiDestroyMember'])
        ->name('membership.members.apiDestroyMember');
    Route::get('statuses', [MembershipController::class, 'indexMemberStatuses'])
        ->name('membership.statuses.index');
    Route::get('members/search', [MembershipController::class, 'apiSearchMembers'])
        ->name('membership.members.apiSearch');
    Route::get('growth', [MembershipController::class, 'growth'])->name('membership.growth');
    
    // QR Code routes for members
    Route::get('members/{id}/qrcode', [QrCodeController::class, 'getMemberQrCode'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('membership.members.qrcode');
    Route::post('members/{id}/qrcode', [QrCodeController::class, 'generateMemberQrCode'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('membership.members.generate.qrcode');
    Route::post('members/{id}/qrcode/email', [QrCodeController::class, 'emailQrCodeToMember'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('membership.members.email.qrcode');

    // 2) Plans
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('plans', [MembershipController::class, 'indexPlans'])
            ->name('membership.plans.indexPlans');
        Route::post('plans', [MembershipController::class, 'storePlan'])
            ->name('membership.plans.storePlan');
        Route::put('plans/{id}', [MembershipController::class, 'updatePlan'])
            ->name('membership.plans.updatePlan');
        Route::delete('plans/{id}', [MembershipController::class, 'destroyPlan'])
            ->name('membership.plans.destroyPlan');
    });

    // 3) Renewals
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::post('renewals', [MembershipController::class, 'storeRenewal'])
            ->name('membership.renewals.store');
        Route::delete('renewals/{id}', [MembershipController::class, 'destroyRenewal'])
            ->name('membership.renewals.destroy');
    });

    // 4) Freezes
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::post('freezes', [MembershipController::class, 'storeFreeze'])
            ->name('membership.freezes.store');
        Route::put('freezes/{id}', [MembershipController::class, 'updateFreeze'])
            ->name('membership.freezes.update');
        Route::delete('freezes/{id}', [MembershipController::class, 'destroyFreeze'])
            ->name('membership.freezes.destroy');

        Route::post('storeLockInMembership', [MembershipController::class, 'storeLockInMembership'])
            ->name('membership.lockIn.store');

        Route::post('import-lock-in', [MembershipController::class, 'importLockInMember'])
            ->name('membership.lockIn.import');
    });
});

Route::get('/membership/expiring', [MembershipController::class, 'expiringMembers'])
    ->middleware('multiGuard:owner,admin,staff')
    ->name('membership.expiring');

                
//route for update status
Route::get('/membership/update-statuses', [MembershipController::class, 'updateMembershipStatuses'])
    ->middleware('multiGuard:owner,admin,staff')
    ->name('membership.updateStatuses');

/*
|---------------------------------------------------------------------------
| BookingController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\BookingController;

Route::prefix('booking')->group(function() {

    // Example: owners/admin/staff can do these
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('create', [BookingController::class, 'createBooking'])->name('booking.create');
        Route::post('/', [BookingController::class, 'storeBooking'])->name('booking.store');
        Route::get('/', [BookingController::class, 'indexBooking'])->name('booking.index');
        Route::get('{id}/edit', [BookingController::class, 'editBooking'])->name('booking.edit');
        Route::put('{id}', [BookingController::class, 'updateBooking'])->name('booking.update');
        Route::post('{id}/cancel', [BookingController::class, 'cancelBooking'])->name('booking.cancel');
        Route::get('today', [BookingController::class, 'getTodayBookings'])->name('booking.today');

        // Facilities
        Route::get('facilities', [BookingController::class, 'indexFacilities'])
            ->name('booking.facilities.index');

        // Sessions
        Route::get('sessions', [BookingController::class, 'indexSessions'])->name('booking.sessions.index');
        Route::get('sessions/create', [BookingController::class, 'createSession'])->name('booking.sessions.create');
        Route::post('sessions', [BookingController::class, 'storeSession'])->name('booking.sessions.store');
        Route::put('sessions/{id}', [BookingController::class, 'updateSession'])->name('booking.sessions.update');
        Route::post('sessions/{id}/cancel', [BookingController::class, 'cancelSession'])->name('booking.sessions.cancel');

        Route::post('sessions/book', [BookingController::class, 'storeSessionBooking'])->name('booking.sessions.book');
        Route::post('sessions/waitlist', [BookingController::class, 'addToWaitlist'])->name('booking.sessions.waitlist');
        Route::post('sessions/attendance', [BookingController::class, 'markAttendance'])->name('booking.sessions.attendance');
    });

    // Some routes might not require staff
    Route::get('most-popular', [BookingController::class, 'mostPopular'])->name('booking.mostPopular');
    Route::get('trends', [BookingController::class, 'bookingTrends'])->name('booking.trends');
});

Route::get('/booking/sessions/bookings', [BookingController::class, 'listSessionBookings'])
    ->middleware('multiGuard:owner,admin,staff');

Route::delete('/booking/{id}', [BookingController::class, 'destroyBooking'])
    ->middleware('multiGuard:owner,admin,staff');

Route::delete('/booking/sessions/{id}', [BookingController::class, 'cancelSession'])
    ->middleware('multiGuard:owner,admin,staff');

use App\Http\Controllers\CoachController;

Route::middleware('multiGuard:owner,admin,staff')->group(function() {
    // Coach CRUD
    Route::get('/coaches', [CoachController::class, 'index']);
    Route::post('/coaches', [CoachController::class, 'store']);
    Route::get('/coaches/{id}', [CoachController::class, 'show']);
    Route::put('/coaches/{id}', [CoachController::class, 'update']);
    Route::delete('/coaches/{id}', [CoachController::class, 'destroy']);
    
    // Availability CRUD for each coach
    Route::post('/coaches/{coachId}/availabilities', [CoachController::class, 'storeAvailability']);
    Route::put('/coaches/{coachId}/availabilities/{availabilityId}', [CoachController::class, 'updateAvailability']);
    Route::delete('/coaches/{coachId}/availabilities/{availabilityId}', [CoachController::class, 'destroyAvailability']);
    Route::post('/coaches/{coachId}/generate-timeslots', [CoachController::class, 'generateTimeslots']);
});

use App\Http\Controllers\StaffController;

// Everything under /staff
Route::prefix('staff')->group(function () {

    // 1) The routes for staff that owners, admins, and staff can all access:
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('/authuser', [StaffController::class, 'getAuthUser']);
        // Staff main CRUD
        Route::get('/', [StaffController::class, 'indexStaffJson'])->name('staff.index');
        Route::post('/', [StaffController::class, 'storeStaff'])->name('staff.store');
        Route::put('/{id}', [StaffController::class, 'updateStaff'])->name('staff.update');
        Route::delete('/{id}', [StaffController::class, 'destroyStaff'])->name('staff.destroy');
        // For staff/metrics
        Route::get('/metrics', [StaffController::class, 'getStaffMetrics'])->name('staff.metrics');
        // Attendance
        Route::post('/attendance', [StaffController::class, 'storeAttendance'])->name('staff.attendance.store');
        Route::get('attendance', [StaffController::class, 'indexAttendance'])->name('staff.attendance.index');
        Route::put('attendance/{id}', [StaffController::class, 'updateAttendance'])->name('staff.attendance.update');
        Route::delete('attendance/{id}', [StaffController::class, 'destroyAttendance'])->name('staff.attendance.destroy');
        Route::post('attendance/clock-in-out', [StaffController::class, 'clockInOut'])->name('staff.attendance.clockInOut');
        Route::get('attendance-analytics', [StaffController::class, 'attendanceAnalytics'])->name('staff.attendance.analytics');
        Route::get('{staff}/attendance-range', [StaffController::class, 'attendanceRange'])->name('staff.attendance.range');

        // Tasks
        Route::prefix('tasks')->group(function() {
            Route::get('/', [StaffController::class, 'indexTasks'])->name('staff.tasks.index');
            Route::post('/', [StaffController::class, 'storeTask'])->name('staff.tasks.store');
            Route::put('/{id}', [StaffController::class, 'updateTask'])->name('staff.tasks.update');
            Route::delete('/{id}', [StaffController::class, 'destroyTask'])->name('staff.tasks.destroy');
        });

        // Schedules
        Route::prefix('schedules')->group(function() {
            Route::get('/', [StaffController::class, 'indexSchedules'])->name('staff.schedules.index');
            Route::post('/', [StaffController::class, 'storeSchedule'])->name('staff.schedules.store');
            Route::put('/{id}', [StaffController::class, 'updateSchedule'])->name('staff.schedules.update');
            Route::delete('/{id}', [StaffController::class, 'destroySchedule'])->name('staff.schedules.destroy');
            Route::get('/{id}/schedule-range', [StaffController::class, 'scheduleRange'])->name('staff.schedules.range');
            Route::post('/bulk-store', [StaffController::class, 'bulkStoreSchedules'])->name('staff.schedules.bulkStore');
        });

        // Additional
        Route::get('performance', [StaffController::class, 'performance'])->name('staff.performance');
        Route::get('dashboard-info', [StaffController::class, 'staffDashboardInfo'])->name('staff.dashboard.info');
        
        //added looged-in-staff
        Route::get('/get-logged-in-staff', [\App\Http\Controllers\StaffController::class, 'getLoggedInStaff'])
        ->name('staff.getLoggedInStaff');

        // Fetching Members Filtered by Staff's Branch
        Route::prefix('staff/membership')->middleware('multiGuard:owner,admin,staff')->group(function () {
            Route::get('members', [MembershipController::class, 'apiIndex'])->name('staff.membership.apiIndex');
            Route::get('plans', [MembershipController::class, 'indexPlans'])->name('staff.membership.plans');
            Route::get('statuses', [MembershipController::class, 'indexMemberStatuses'])->name('staff.membership.statuses');
        });
        
    });

    // 2) The routes for payroll & bonus: owners and admins only
    Route::middleware('multiGuard:owner,admin')->group(function() {

        // /staff/payroll
        Route::prefix('payroll')->group(function() {
            // e.g. GET /staff/payroll => index all payrolls
            Route::get('/', [StaffController::class, 'indexPayroll'])->name('staff.payroll.index');

            // e.g. GET /staff/payroll/create => fetch staff list, etc.
            Route::get('create', [StaffController::class, 'createPayroll'])->name('staff.payroll.create');

            // e.g. POST /staff/payroll => store new payroll
            Route::post('/', [StaffController::class, 'storePayroll'])->name('staff.payroll.store');

            // e.g. PUT /staff/payroll/{id} => update existing payroll
            Route::put('{id}', [StaffController::class, 'updatePayroll'])->name('staff.payroll.update');

            // e.g. DELETE /staff/payroll/{id} => remove payroll
            Route::delete('{id}', [StaffController::class, 'destroyPayroll'])->name('staff.payroll.destroy');
        });

        // /staff/bonus
        Route::prefix('bonus')->group(function() {
            // e.g. GET /staff/bonus/create => show staff for awarding bonus
            Route::get('create', [StaffController::class, 'createBonus'])->name('staff.bonus.create');
            
            // e.g. POST /staff/bonus => store newly created bonus
            Route::post('/', [StaffController::class, 'storeBonus'])->name('staff.bonus.store');

            // If you have an index or a delete method for bonus, add them:
            // Route::get('/', [StaffController::class, 'indexBonus'])->name('bonus.index');
            // Route::delete('{id}', [StaffController::class, 'destroyBonus'])->name('bonus.destroy');
        });
    });
});

Route::middleware('auth:admin')->prefix('admin')->group(function () {
    Route::get('staff', [StaffController::class, 'indexStaffJson'])->name('admin.staff');
});

Route::post('/staff/schedules/bulk-store-custom', [StaffController::class, 'bulkStoreCustom'])
    ->name('staff.schedules.bulkStoreCustom');

/*
|---------------------------------------------------------------------------
| OperationsController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\OperationsController;

Route::prefix('operations')->group(function() {

    // Maintenance Logs
    Route::prefix('maintenance-logs')->name('maintenance.logs.')->group(function() {
        Route::middleware('multiGuard:owner,admin,staff')->group(function() {
            Route::get('/', [OperationsController::class, 'indexMaintenanceLogs'])->name('index');
            Route::post('/', [OperationsController::class, 'storeMaintenanceLog'])->name('store');
            Route::put('/{id}', [OperationsController::class, 'updateMaintenanceLog'])->name('update');
            Route::delete('/{id}', [OperationsController::class, 'destroyMaintenanceLog'])->name('destroy');
            Route::get('/maintenance-stats', [OperationsController::class, 'getMaintenanceStats'])
                ->name('maintenance.stats');
        });
    });

    // Inventory
    Route::get('products', [OperationsController::class, 'indexProducts'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('operations.products.index');

    Route::post('products', [OperationsController::class, 'storeProduct'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('operations.products.store');

    Route::post('products/adjust', [OperationsController::class, 'adjustStock'])
        ->middleware('multiGuard:owner,admin,staff,staff')
        ->name('operations.products.adjust');

    Route::delete('products/{id}', [OperationsController::class, 'destroyProduct'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('operations.products.destroy');

    Route::get('stock-levels', [OperationsController::class, 'viewStockLevels'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('operations.products.stockLevels');

    // Lockers
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('lockers', [OperationsController::class, 'indexLockers'])->name('operations.lockers.index');
        Route::post('lockers', [OperationsController::class, 'storeLocker'])->name('operations.lockers.store');
        Route::post('lockers/borrow', [OperationsController::class, 'borrowLockerKey'])->name('operations.lockers.borrow');
        Route::post('lockers/{usageId}/return', [OperationsController::class, 'returnLockerKey'])->name('operations.lockers.return');
        Route::get('lockers/activity-log', [OperationsController::class, 'lockerActivityLog']);
    });

    // Equipment
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('equipment', [OperationsController::class, 'indexEquipment'])->name('operations.equipment.index');
        Route::post('equipment', [OperationsController::class, 'storeEquipment'])->name('operations.equipment.store');
    });

    // Walk-ins
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('walk-ins', [OperationsController::class, 'indexWalkIns'])->name('operations.walkins.index');
        Route::get('walk-ins/create', [OperationsController::class, 'createWalkIn'])->name('operations.walkins.create');
        Route::post('walk-ins', [OperationsController::class, 'storeWalkIn'])->name('operations.walkins.store');
        Route::get('walk-ins/{id}/edit', [OperationsController::class, 'editWalkIn'])->name('operations.walkins.edit');
        Route::put('walk-ins/{id}', [OperationsController::class, 'updateWalkIn'])->name('operations.walkins.update');
        Route::delete('walk-ins/{id}', [OperationsController::class, 'destroyWalkIn'])->name('operations.walkins.destroy');
    });

    // Member Visits
    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('visits/create', [OperationsController::class, 'createVisit'])->name('operations.visits.create');
        Route::post('visits', [OperationsController::class, 'storeVisit'])->name('operations.visits.store');
        Route::get('visits', [OperationsController::class, 'indexVisits'])->name('operations.visits.index');
        Route::get('visits/{id}/edit', [OperationsController::class, 'editVisit'])->name('operations.visits.edit');
        Route::put('visits/{id}', [OperationsController::class, 'updateVisit'])->name('operations.visits.update');
        Route::get('visits/history', [OperationsController::class, 'historyVisits'])
        ->name('operations.visits.history');
    });
});

/*
|---------------------------------------------------------------------------
| FinanceController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\FinanceController;

Route::prefix('finance')->group(function() {

    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('summary', [FinanceController::class, 'indexSummary'])->name('finance.summary.index');
        Route::get('financial-summary', [FinanceController::class, 'getFinancialSummary'])->name('finance.summary');
    });

    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::put('summary/{id}', [FinanceController::class, 'updateSummary'])->name('finance.summary.update');
        Route::delete('summary/{id}', [FinanceController::class, 'destroySummary'])->name('finance.summary.destroy');

        Route::get('cashflow/create', [FinanceController::class, 'createCashFlow'])->name('finance.cashflow.create');
        Route::post('cashflow', [FinanceController::class, 'storeCashFlow'])->name('finance.cashflow.store');
        Route::put('cashflow/{id}', [FinanceController::class, 'updateCashFlow'])->name('finance.cashflow.update');
        Route::delete('cashflow/{id}', [FinanceController::class, 'destroyCashFlow'])->name('finance.cashflow.destroy');

        Route::get('expenses/create', [FinanceController::class, 'createExpense'])->name('finance.expenses.create');
        Route::post('expenses', [FinanceController::class, 'storeExpense'])->name('finance.expenses.store');
        Route::get('expenses/{id}/edit', [FinanceController::class, 'editExpense'])->name('finance.expenses.edit');
        Route::put('expenses/{id}', [FinanceController::class, 'updateExpense'])->name('finance.expenses.update');
        Route::delete('expenses/{id}', [FinanceController::class, 'destroyExpense'])->name('finance.expenses.destroy');
    });

    Route::middleware('multiGuard:owner,admin,staff')->group(function() {
        Route::get('cashflow', [FinanceController::class, 'indexCashFlow'])->name('finance.cashflow.index');
        Route::get('expenses', [FinanceController::class, 'indexExpenses'])->name('finance.expenses.index');

        Route::get('promotions', [FinanceController::class, 'indexPromotions'])->name('finance.promotions.index');
        Route::post('promotions', [FinanceController::class, 'storePromotion'])->name('finance.promotions.store');
        Route::post('promotions/{id}/toggle', [FinanceController::class, 'togglePromotion'])->name('finance.promotions.toggle');

        Route::post('generate-cashflow', [FinanceController::class, 'generateDailyCashFlow'])->name('finance.generate-cashflow');
    });
});

/*
|---------------------------------------------------------------------------
| SystemController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\SystemController;

Route::prefix('system')->group(function() {
    // System Logs
    Route::middleware('multiGuard:owner,admin')->group(function() {
        Route::get('logs', [SystemController::class, 'indexLogs'])->name('system.logs.index');
        Route::delete('logs/{id}', [SystemController::class, 'destroyLog'])->name('system.logs.destroy');
    });

    // Reports
    Route::middleware('multiGuard:owner,admin')->group(function() {
        Route::get('reports', [SystemController::class, 'generateReports'])->name('system.reports');
    });

    // Everyone can see system metrics?
    Route::get('metrics', [SystemController::class, 'systemMetrics'])->name('system.metrics');
});

/*
|---------------------------------------------------------------------------
| BranchController
|---------------------------------------------------------------------------
*/
use App\Http\Controllers\BranchController;

Route::middleware('auth:admin')->prefix('admin')->group(function () {
    Route::get('branches', [BranchController::class, 'indexJson'])->name('admin.branches');
});

Route::prefix('owner/branches')->name('branches.')->group(function() {
    // Accessible by owner, admin, staff
    Route::get('/', [BranchController::class, 'indexJson'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('index');

    // Write ops only for owner/admin
    Route::middleware('multiGuard:owner,admin')->group(function() {
        Route::post('/', [BranchController::class, 'storeJson'])->name('store');
        Route::put('/{id}', [BranchController::class, 'updateJson'])->name('update');
        Route::delete('/{id}', [BranchController::class, 'destroyJson'])->name('destroy');

        // If you want staff also:
        Route::get('/branch/stats', [BranchController::class, 'getBranchStats'])
             ->middleware('multiGuard:owner,admin,staff')
             ->name('stats');
    });
});

/*
|---------------------------------------------------------------------------
| FacilityController
|---------------------------------------------------------------------------
*/

use App\Http\Controllers\FacilityController;
// Accessible by owner, admin
Route::prefix('facilities')->group(function() {
    // GET /facilities
    Route::get('/', [FacilityController::class, 'index'])->middleware('multiGuard:owner,admin,staff')->name('facilities.index');

    // POST /facilities
    Route::post('/', [FacilityController::class, 'store'])->middleware('multiGuard:owner,admin')->name('facilities.store');

    // GET /facilities/{id}
    Route::get('{id}', [FacilityController::class, 'show'])->middleware('multiGuard:owner,admin,staff')->name('facilities.show');

    // PUT /facilities/{id}
    Route::put('{id}', [FacilityController::class, 'update'])->middleware('multiGuard:owner,admin,staff')->name('facilities.update');

    // DELETE /facilities/{id}
    Route::delete('{id}', [FacilityController::class, 'destroy'])->middleware('multiGuard:owner,admin')->name('facilities.destroy');
});

use App\Http\Controllers\MonthlyClientController;   

Route::prefix('monthly-clients')->group(function () {
    // Define the literal route first
    Route::get('/attendances-all', [MonthlyClientController::class, 'indexAllAttendances']);

    // Then define the routes with the dynamic parameter
    Route::get('/', [MonthlyClientController::class, 'index']);
    Route::get('/{id}', [MonthlyClientController::class, 'show']);
    Route::post('/', [MonthlyClientController::class, 'store']);
    Route::put('/{id}', [MonthlyClientController::class, 'update']);
    Route::delete('/{id}', [MonthlyClientController::class, 'destroy']);
    Route::get('/{id}/attendances', [MonthlyClientController::class, 'indexAttendances']);
    Route::post('/{id}/attendances', [MonthlyClientController::class, 'storeAttendance']);
});

// Separate route for staff to create monthly clients
Route::post('staff/monthly-clients', [MonthlyClientController::class, 'store']);

use App\Http\Controllers\ReportsController;

Route::get('/reports', [ReportsController::class, 'index']);

// WebAuthn routes
use App\Http\Controllers\WebAuthnController;

Route::prefix('api/webauthn')->group(function () {
    // Registration routes
    Route::post('/register/options', [WebAuthnController::class, 'generateRegistrationOptions']);
    Route::post('/register', [WebAuthnController::class, 'verifyAndSaveRegistration']);
    
    // Authentication routes
    Route::post('/authenticate/options', [WebAuthnController::class, 'generateAuthenticationOptions']);
    Route::post('/authenticate', [WebAuthnController::class, 'verifyAuthentication']);
});

/*
|---------------------------------------------------------------------------
| QR Code Routes
|---------------------------------------------------------------------------
*/

Route::prefix('qrcode')->middleware('multiGuard:owner,admin,staff')->group(function () {
    // Staff routes for QR code check-in
    Route::post('/verify', [QrCodeController::class, 'verifyQrCode']);
    Route::post('/check-in', [QrCodeController::class, 'checkInWithQrCode']);
    Route::get('/debug-config', [QrCodeController::class, 'debugMailjetConfig']);
});

// Member QR code routes - these would be protected by member authentication
Route::prefix('membership')->group(function() {
    Route::get('/members/{id}/qrcode', [QrCodeController::class, 'getMemberQrCode'])
        ->middleware('multiGuard:owner,admin,staff')
        ->name('membership.members.qrcode');
        
    Route::get('/member/qrcode', [QrCodeController::class, 'getCurrentMemberQrCode'])
        ->middleware('auth:member') // If you have a member auth guard
        ->name('member.qrcode');
});

// Temporary WebAuthn debug route
Route::get('/debug-webauthn', function () {
    try {
        // Try to get the WebAuthn services from Laravel container
        $loader = app('webauthn.credential.loader');
        $attestationValidator = app('webauthn.attestation.validator');
        $assertionValidator = app('webauthn.assertion.validator');
        
        // If we get here, the services were resolved successfully
        return response()->json([
            'success' => true,
            'services' => [
                'loader' => get_class($loader),
                'attestation_validator' => get_class($attestationValidator),
                'assertion_validator' => get_class($assertionValidator),
            ]
        ]);
    } catch (\Exception $e) {
        // If we get here, something went wrong
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }
});

// Temporary WebAuthn class check route
Route::get('/debug-webauthn-classes', function () {
    $classes = [
        // Try different possible namespaces
        'Webauthn\\PublicKeyCredentialLoader',
        'Webauthn\\Bundle\\Service\\PublicKeyCredentialLoader',
        'Web\\Authn\\PublicKeyCredentialLoader',
        'Webauthn\\Service\\PublicKeyCredentialLoader',
        'Webauthn\\AuthenticatorAttestationResponseValidator',
        'Webauthn\\Bundle\\Service\\AuthenticatorAttestationResponseValidator',
        'Webauthn\\AuthenticatorAssertionResponseValidator',
        'Webauthn\\Bundle\\Service\\AuthenticatorAssertionResponseValidator',
    ];
    
    $results = [];
    foreach ($classes as $class) {
        $results[$class] = class_exists($class);
    }
    
    // Find vendor directory
    $vendor_dir = base_path('vendor');
    
    // Check if webauthn directory exists
    $webauthn_dir = $vendor_dir . '/web-auth/webauthn-lib';
    $has_webauthn_dir = is_dir($webauthn_dir);
    
    return response()->json([
        'class_exists' => $results,
        'vendor_dir' => $vendor_dir,
        'webauthn_dir' => $webauthn_dir,
        'has_webauthn_dir' => $has_webauthn_dir,
        'php_version' => phpversion(),
    ]);
});
