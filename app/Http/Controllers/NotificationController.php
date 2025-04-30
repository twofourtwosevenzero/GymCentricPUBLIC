<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Gate;
use App\Models\SystemSetting;
use App\Models\NotificationTemplate;
use App\Models\Notification;
use App\Models\Member;
// Add Mailjet imports
use Mailjet\Resources;
use Mailjet\Client;


class NotificationController extends Controller
{
    /* ------------------------------------------------------------------
     * D. NOTIFICATION CHANNELS SETUP
     * - Storing credentials/limits in 'system_settings'
     * ------------------------------------------------------------------ */

    // 8. Semaphore SMS Creds => route:Owner
    public function viewSemaphore()
    {
        // Usually staff doesn't have access to global credentials, so no branch logic here.
        $setting = SystemSetting::where('key','semaphore_key')->first();
        $semaphoreKey = $setting ? $setting->value : '';

        return Inertia::render('Notifications/Setup/Semaphore', [
            'semaphoreKey' => $semaphoreKey
        ]);
    }

    public function updateSemaphore(Request $request)
    {
        $data = $request->validate([
            'semaphoreKey' => 'required|string|max:255',
        ]);

        // Upsert the system_settings row
        SystemSetting::updateOrCreate(
            ['key' => 'semaphore_key'],
            ['value' => $data['semaphoreKey']]
        );

        return redirect()
            ->back()
            ->with('success','Semaphore credentials updated successfully.');
    }

    // 9. SMS Credit Limits => route:Owner,Admin
    public function viewSMSLimit()
    {
        $setting = SystemSetting::where('key','sms_daily_limit')->first();
        $limit = $setting ? $setting->value : '1000';

        return Inertia::render('Notifications/Setup/SMSLimit', [
            'limit' => $limit
        ]);
    }

    public function updateSMSLimit(Request $request)
    {
        $data = $request->validate([
            'limit' => 'required|integer|min:0'
        ]);

        SystemSetting::updateOrCreate(
            ['key'=>'sms_daily_limit'],
            ['value'=>$data['limit']]
        );

        return redirect()
            ->back()
            ->with('success','SMS credit limit updated.');
    }

    // 10. Mailjet Email Credentials => route:Owner
    public function viewMailjet()
    {
        $setting = SystemSetting::where('key','mailjet_key')->first();
        $mailjetKey = $setting ? $setting->value : '';

        return Inertia::render('Notifications/Setup/Mailjet', [
            'mailjetKey' => $mailjetKey
        ]);
    }

    public function updateMailjet(Request $request)
    {
        $data = $request->validate([
            'mailjetKey' => 'required|string|max:255',
        ]);

        SystemSetting::updateOrCreate(
            ['key' => 'mailjet_key'],
            ['value'=> $data['mailjetKey']]
        );

        return redirect()
            ->back()
            ->with('success','Mailjet credentials updated.');
    }


    /* ------------------------------------------------------------------
     * E. NOTIFICATION SENDING & MANAGEMENT
     * - Typically logs in "notifications" table
     * ------------------------------------------------------------------ */

    // 11. Send Bulk SMS => route:Owner,Admin,Staff
    public function sendBulkSMS(Request $request)
    {
        $staff = auth('staff')->user();
        $admin = auth('admin')->user();
        $owner = auth('owner')->user();

        // In a real app, staff might only send to their own branch's members
        // But this code doesn't do a membership query. It's just an example.
        // You could extend to fetch members of staff->BranchID if you want.

        $data = $request->validate([
            'message'        => 'required|string|max:500',
            'recipientGroup' => 'nullable|string|max:50',
        ]);

        // Possibly integrate with your SMS service here.
        Notification::create([
            'MemberID'          => null,  // bulk => not a specific member
            'EventTrigger'      => 'BulkSMS',
            'Message'           => $data['message'],
            'NotificationMethod'=> 'SMS',
            'SentDate'          => now(),
            'Status'            => 'Sent',
        ]);

        return redirect()->back()->with('success','Bulk SMS sent.');
    }

    // 12. Send Bulk Emails => route:Owner,Admin,Staff
    public function sendBulkEmail(Request $request)
    {
        $staff = auth('staff')->user();
        // If staff => limit to staff->BranchID members? 
        // The snippet doesn't do that by default, but you can adapt it similarly.

        $data = $request->validate([
            'subject' => 'required|string|max:100',
            'body'    => 'required|string|max:2000',
        ]);

        // Similar approach: no specific member, so no direct branch check here.
        Notification::create([
            'MemberID'          => null,
            'EventTrigger'      => 'BulkEmail',
            'Message'           => "Subject: {$data['subject']}\n\n{$data['body']}",
            'NotificationMethod'=> 'Email',
            'SentDate'          => now(),
            'Status'            => 'Sent',
        ]);

        return redirect()->back()->with('success','Bulk Emails sent.');
    }

    // 13. Ad-hoc => route:Owner,Admin,Staff
    public function adHocNotification(Request $request)
    {
        $staff = auth('staff')->user();
        $admin = auth('admin')->user();
        $owner = auth('owner')->user();

        // Staff can only pick members from their branch if you want the same approach
        $data = $request->validate([
            'MemberID' => 'required|exists:members,MemberID',
            'method'   => 'required|string|in:SMS,Email',
            'message'  => 'required|string|max:500',
        ]);

        // If staff => check that the chosen member is from staff->BranchID
        if ($staff) {
            $member = Member::findOrFail($data['MemberID']);
            if ($member->StartedBranchID != $staff->BranchID) {
                abort(403, 'You cannot send an ad-hoc notification to another branch\'s member.');
            }
        }

        // Insert row in "notifications"
        Notification::create([
            'MemberID'          => $data['MemberID'],
            'EventTrigger'      => 'AdHoc',
            'Message'           => $data['message'],
            'NotificationMethod'=> $data['method'],
            'SentDate'          => now(),
            'Status'            => 'Sent',
        ]);

        return redirect()->back()->with('success','Ad-hoc notification sent.');
    }

    // 14. View SMS Credits => route:Owner,Admin,Staff
    public function viewSMSCredits()
    {
        $limitSetting = SystemSetting::where('key','sms_daily_limit')->first();
        $limit = $limitSetting ? (int)$limitSetting->value : 1000;

        // If you track usage by branch, staff sees only their usage. 
        // Here we keep it simple: a universal approach.
        $creditsUsed = 200; 
        $creditsRemaining = $limit - $creditsUsed;

        return Inertia::render('Notifications/SMSCredits', [
            'limit'            => $limit,
            'creditsUsed'      => $creditsUsed,
            'creditsRemaining' => $creditsRemaining,
        ]);
    }

    // 15. Advanced Email Settings => route:Owner
    public function advancedMailjet()
    {
        // No branch logic; typically a global owner feature
        return Inertia::render('Notifications/Setup/AdvancedMailjet');
    }


    public function indexAnnouncements()
{
    // Return the latest announcements from notifications table
    $announcements = Notification::where('EventTrigger','Announcement')
        ->orderBy('NotificationID','desc')
        ->get();

    return response()->json($announcements);
}

public function storeAnnouncement(Request $request)
{
    // Validate input
    $data = $request->validate([
        'topic'   => 'required|string|max:100',
        'message' => 'required|string|max:2000',
    ]);

    // Create in notifications table
    $notif = Notification::create([
        'MemberID'           => null,
        'EventTrigger'       => 'Announcement',
        // We'll combine topic + message into 'Message' field
        'Message'            => "Topic: {$data['topic']}\n{$data['message']}",
        'NotificationMethod' => 'Internal', // or some arbitrary label
        'SentDate'           => now(),
        'Status'             => 'Sent',
    ]);

    // Return the newly created announcement as JSON
    return response()->json($notif, 201);
}

public function updateAnnouncement(Request $request, $id)
{
    $data = $request->validate([
        'topic'   => 'required|string|max:100',
        'message' => 'required|string|max:2000',
    ]);

    // Find the target "announcement" in notifications
    $notif = Notification::where('EventTrigger','Announcement')
        ->where('NotificationID', $id)
        ->firstOrFail();

    $notif->update([
        'Message' => "Topic: {$data['topic']}\n{$data['message']}",
    ]);

    return response()->json($notif);
}

public function destroyAnnouncement($id)
{
    $notif = Notification::where('EventTrigger','Announcement')
        ->where('NotificationID', $id)
        ->firstOrFail();

    $notif->delete();

    return response()->json(['message' => 'Announcement deleted.'], 200);
}

/**
 * Send Notification to selected staff (JSON approach)
 */
public function sendStaffNotification(Request $request)
{
    $data = $request->validate([
        'staffIds' => 'required|array',
        'subject'  => 'required|string|max:100',
        'message'  => 'required|string|max:2000',
    ]);

    // Determine sender's name from authenticated user (adjust logic as needed)
    $senderName = 'System';
    if ($user = auth('staff')->user() ?? auth('admin')->user() ?? auth('owner')->user()) {
        $senderName = $user->name;
    }

    foreach ($data['staffIds'] as $staffId) {
        Notification::create([
            'MemberID'           => null,
            'EventTrigger'       => 'StaffNotice',
            'Subject'            => $data['subject'],           // Save subject
            'Message'            => $data['message'],           // Save message separately
            'Sender'             => $senderName,                // Save sender's name
            'NotificationMethod' => 'Internal',
            'SentDate'           => now(),
            'Status'             => 'Sent',
        ]);
    }

    return response()->json(['status' => 'success', 'message' => 'Staff notifications sent.'], 200);
}

public function getStaffNotifications(Request $request)
{
    $notifications = Notification::where('EventTrigger', 'StaffNotice')
                        ->orderBy('NotificationID', 'desc')
                        ->get();
    return response()->json($notifications);
}




    /* ------------------------------------------------------------------
     * F. NOTIFICATION TEMPLATES
     * ------------------------------------------------------------------ */

    // 16. Create/Edit => route:All
    public function indexTemplates()
    {
        // Typically global, no branch column in notification_templates
        $templates = NotificationTemplate::orderBy('name','asc')->get();

        return Inertia::render('Notifications/Templates/Index', [
            'templates' => $templates
        ]);
    }

    public function storeTemplate(Request $request)
    {
        $data = $request->validate([
            'TemplateID' => 'nullable|exists:notification_templates,id',
            'name'       => 'required|string|max:100|unique:notification_templates,name,'.$request->TemplateID.',id',
            'content'    => 'required|string',
        ]);

        if (!empty($data['TemplateID'])) {
            // Update existing
            $template = NotificationTemplate::findOrFail($data['TemplateID']);
            $template->update([
                'name'    => $data['name'],
                'content' => $data['content'],
            ]);
        } else {
            // Create new
            NotificationTemplate::create([
                'name'    => $data['name'],
                'content' => $data['content'],
            ]);
        }

        return redirect()->back()->with('success','Template saved successfully.');
    }

    public function editTemplate($id)
    {
        $template = NotificationTemplate::findOrFail($id);

        return Inertia::render('Notifications/Templates/Edit', [
            'template' => $template
        ]);
    }

    public function updateTemplate(Request $request, $id)
    {
        $template = NotificationTemplate::findOrFail($id);

        $data = $request->validate([
            'name'    => 'required|string|max:100|unique:notification_templates,name,'.$template->id.',id',
            'content' => 'required|string',
        ]);

        $template->update($data);

        return redirect()->route('notifications.templates.index')
            ->with('success','Template updated successfully.');
    }

    // 17. Approve => route:All
    public function approveTemplate($id)
    {
        $template = NotificationTemplate::findOrFail($id);
        $template->update(['approved' => true]);

        return redirect()->back()->with('success','Template approved.');
    }

    public function sendExpiringMembershipReminder(Request $request)
    {
        // 1) Fetch members expiring in 7 days
        $expiringSoon = Member::whereBetween('MembershipEndDate', [now(), now()->addDays(7)])->get();
    
        if ($expiringSoon->isEmpty()) {
            return response()->json([
                'status'  => 'no-action',
                'message' => 'No members expiring in 7 days.'
            ], 200);
        }
    
        // 2) Initialize Mailjet Client
        $mj = new Client(
            config('services.mailjet.api_key'),
            config('services.mailjet.secret_key'),
            true,
            ['version' => 'v3.1']
        );
    
        // 3) Build the messages array for all expiring members
        $messages = [];
        foreach ($expiringSoon as $member) {
            if (!empty($member->Email)) {
                $memberName = !empty($member->FullName) ? $member->FullName : 'Valued Member';
                $msg = [
                    'From' => [
                        'Email' => config('services.mailjet.from.address'),
                        'Name'  => config('services.mailjet.from.name'),
                    ],
                    'To' => [
                        ['Email' => $member->Email, 'Name' => $memberName],
                    ],
                    'TemplateID'       => 6731692, // Your Mailjet Template ID
                    'TemplateLanguage' => true,
                    'Subject'          => 'CONTNENTAL FITNESS GYM PAYMENT DUE',
                    'Variables'        => [
                        'member_name' => $memberName,
                        'expiry_date' => \Carbon\Carbon::parse($member->MembershipEndDate)->format('F j, Y'),
                    ],
                ];
                $messages[] = $msg;
            }
        }
    
        if (empty($messages)) {
            return response()->json([
                'status'  => 'no-action',
                'message' => 'No valid email recipients found.'
            ], 200);
        }
    
        // 4) Chunk messages into batches of 50 to comply with Mailjet’s limits.
        $chunks = array_chunk($messages, 50);
        $overallSuccess = 0;
        $overallFailed  = 0;
        $responses      = [];
    
        foreach ($chunks as $chunk) {
            $body = ['Messages' => $chunk];
            $response = $mj->post(Resources::$Email, ['body' => $body]);
            $responseData = $response->getData();
            
            // Count successes and failures from each chunk response
            foreach ($responseData['Messages'] as $msg) {
                if (isset($msg['Status']) && strtolower($msg['Status']) === 'success') {
                    $overallSuccess++;
                } else {
                    $overallFailed++;
                }
            }
            $responses[] = $responseData;
        }
    
        $status = ($overallFailed === 0) ? 'success' : 'partial';
    
        return response()->json([
            'status'  => $status,
            'message' => "Expiry reminder emails sent! Success: {$overallSuccess}, Failed: {$overallFailed}",
            'responses' => $responses,
        ], 200);
    }


    public function sendExpiringMembershipReminderForSelected(Request $request)
    {
        $data = $request->validate([
            'memberIds' => 'required|array',
        ]);

        // Fetch only the selected members that are expiring in the next 7 days.
        $expiringMembers = Member::whereIn('MemberID', $data['memberIds'])
            ->whereBetween('MembershipEndDate', [now(), now()->addDays(7)])
            ->get();

        if ($expiringMembers->isEmpty()) {
            return response()->json([
                'status'  => 'no-action',
                'message' => 'No selected members are expiring in 7 days.'
            ], 200);
        }

        // Initialize Mailjet Client
        $mj = new \Mailjet\Client(
            config('services.mailjet.api_key'),
            config('services.mailjet.secret_key'),
            true,
            ['version' => 'v3.1']
        );

        // Build the messages array
        $messages = [];
        foreach ($expiringMembers as $member) {
            if (!empty($member->Email)) {
                $memberName = $member->FullName ?: 'Valued Member';
                $messages[] = [
                    'From' => [
                        'Email' => config('services.mailjet.from.address'),
                        'Name'  => config('services.mailjet.from.name'),
                    ],
                    'To' => [
                        ['Email' => $member->Email, 'Name' => $memberName],
                    ],
                    'TemplateID'       => 6731692, // Your Mailjet Template ID for expiry reminder
                    'TemplateLanguage' => true,
                    'Subject'          => 'CONTNENTAL FITNESS GYM PAYMENT DUE',
                    'Variables'        => [
                        'member_name' => $memberName,
                        'expiry_date' => \Carbon\Carbon::parse($member->MembershipEndDate)->format('F j, Y'),
                    ],
                ];
            }
        }

        if (empty($messages)) {
            return response()->json([
                'status'  => 'no-action',
                'message' => 'No valid email recipients found among selected members.'
            ], 200);
        }

        // Send emails in chunks to respect Mailjet limits
        $chunks = array_chunk($messages, 50);
        $overallSuccess = 0;
        $overallFailed  = 0;
        foreach ($chunks as $chunk) {
            $body = ['Messages' => $chunk];
            $response = $mj->post(\Mailjet\Resources::$Email, ['body' => $body]);
            $responseData = $response->getData();
            foreach ($responseData['Messages'] as $msg) {
                if (isset($msg['Status']) && strtolower($msg['Status']) === 'success') {
                    $overallSuccess++;
                } else {
                    $overallFailed++;
                }
            }
        }
        
        $status = ($overallFailed === 0) ? 'success' : 'partial';
        
        return response()->json([
            'status'  => $status,
            'message' => "Expiry reminder emails sent for selected members! Success: {$overallSuccess}, Failed: {$overallFailed}",
        ], 200);
    }

    // private function getMailjetTemplateVariables($templateId)
    // {
    //     $mj = new \Mailjet\Client(
    //         config('services.mailjet.api_key'),
    //         config('services.mailjet.secret_key'),
    //         true,
    //         ['version' => 'v3']
    //     );

    //     // Fetch the template details
    //     $response = $mj->get(\Mailjet\Resources::$Template, ['id' => $templateId]);

    //     if (!$response->success()) {
    //         \Log::error('Mailjet Template Fetch Error:', $response->getData());
    //         return null; // Return null if API request fails
    //     }

    //     $templateData = $response->getData();
        
    //     if (!isset($templateData['Data'][0]['Variables'])) {
    //         \Log::warning("Mailjet Template ID $templateId has no declared variables.");
    //         return []; // No variables found in template
    //     }

    //     return $templateData['Data'][0]['Variables']; // Returns array of required variables
    // }

    public function sendMailjetTemplate(Request $request)
    {
        $data = $request->validate([
            'templateId'       => 'required|integer',
            'memberIds'        => 'required|array',
            'bookingId'        => 'nullable|integer',
            'sessionBookingId' => 'nullable|integer',
        ]);
    
        // 1) Fetch the members
        $members = Member::whereIn('MemberID', $data['memberIds'])->get();
    
        // 2) Hard-code all placeholders from your cheat sheet:
        $requiredVariables = [
            // -- 1) General / Member Variables --
            'member_name',
            'member_email',
            'member_phone',
            'membership_start_date',
            'expiry_date',
            'membership_card_number',
            'membership_status',
            'plan_name',
            'gym_name',
            'branch_name',
    
            // -- 2) Coach & Session Variables --
            'coach_name',
            'coach_specialty',
            'session_name',
            'session_type',
            'start_time',
            'end_time',
            'session_location',
            'session_fee',
    
            // -- 3) Facility Booking Variables --
            'facility_name',
            'facility_branch',
            'booking_date',
            'booking_time',
            'booking_duration',
            'guest_name',
            'guest_email',
    
            // -- 4) Membership Freeze Variables --
            'freeze_start_date',
            'freeze_end_date',
            'freeze_reason',
            'original_end_date',
            'payment_status', // Also used in freeze context
    
            // -- 5) Membership Renewal & Plan Variables --
            'renewal_date',
            'renewal_start_date',
            'renewal_amount',
            'renewal_instructions',
            'lock_in_months',
    
            // -- 6) Payment & Invoice Variables --
            'payment_amount',
            'payment_date',
            'payment_method',
            'payment_status', // repeated, if you prefer
            'failure_reason',
            'invoice_number',
            'invoice_date',
            'invoice_due_date',
            'invoice_total',
    
            // -- 7) SessionBooking placeholders (some repeated) --
            'session_name',
            'session_type',
            'start_time',
            'end_time',
            'coach_name',
            'booking_date',
            'session_fee',
            'member_name',
        ];
    
        // 3) Create notifications for each valid-email member
        $localNotifs = [];
        foreach ($members as $member) {
            if (!empty($member->Email)) {
                $notif = Notification::create([
                    'MemberID'           => $member->MemberID,
                    'EventTrigger'       => 'MailjetBatch',
                    'Message'            => "Mailjet template #{$data['templateId']} queued.",
                    'NotificationMethod' => 'Email',
                    'SentDate'           => null,
                    'Status'             => 'Queued',
                ]);
                $localNotifs[$member->Email] = $notif;
            }
        }
    
        if (count($localNotifs) === 0) {
            return response()->json([
                'status'  => 'no-action',
                'message' => 'No valid members or emails.',
            ]);
        }
    
        // 4) Prepare the Mailjet client
        $mj = new \Mailjet\Client(
            config('services.mailjet.api_key'),
            config('services.mailjet.secret_key'),
            true,
            ['version' => 'v3.1']
        );
    
        // 5) Build the messages array
        $messages = [];
        foreach ($localNotifs as $email => $notif) {
            $memberId = $notif->MemberID;
            $member   = $members->firstWhere('MemberID', $memberId);
    
            // (Optional) If you’re referencing facilityBooking or sessionBooking
            $facilityBooking = null;
            if (!empty($data['bookingId'])) {
                $facilityBooking = Booking::with('facility.branch')
                    ->where('MemberID', $member->MemberID)
                    ->where('BookingID', $data['bookingId'])
                    ->first();
            }
    
            $sessionBooking = null;
            if (!empty($data['sessionBookingId'])) {
                $sessionBooking = SessionBooking::with(['session.coach', 'member'])
                    ->where('MemberID', $member->MemberID)
                    ->where('BookingID', $data['sessionBookingId'])
                    ->first();
            }
    
            // Populate variables
            $variables = [];
            foreach ($requiredVariables as $var) {
                $variables[$var] = $this->resolvePlaceholder(
                    $member,
                    $var,
                    $facilityBooking,
                    $sessionBooking
                );
            }
    
            $messages[] = [
                'From' => [
                    'Email' => config('services.mailjet.from.address'),
                    'Name'  => config('services.mailjet.from.name'),
                ],
                'To' => [
                    ['Email' => $email, 'Name' => $member->FullName],
                ],
                'TemplateID'       => $data['templateId'],
                'TemplateLanguage' => true,
                'Subject'          => 'Contnental Fitness Gym',
                'Variables'        => $variables,
            ];
        }
    
        // 6) Make the Mailjet API call
        $body = ['Messages' => $messages];
        \Log::info('Final Mailjet Payload: ', $body);
    
        $response = $mj->post(\Mailjet\Resources::$Email, ['body' => $body]);
        if (!$response->success()) {
            foreach ($localNotifs as $notif) {
                $notif->update([
                    'Status'  => 'Failed',
                    'Message' => 'Mailjet request error. Could not send batch.',
                    'SentDate'=> now(),
                ]);
            }
    
            return response()->json([
                'status'  => 'error',
                'message' => 'Mailjet API error on the entire request.',
                'data'    => $response->getData(),
            ], 500);
        }
    
        return response()->json([
            'status' => 'success',
            'message' => 'Emails successfully sent.',
            'mailjet_response' => $response->getData(),
        ]);
    }
    
    protected function resolvePlaceholder(Member $member, string $var): string
    {
        try {
            switch ($var) {

                // -- General / Member Variables --
                case 'member_name':
                    return $member->FullName ?? 'Valued Member';

                case 'member_email':
                    return $member->Email ?? 'N/A';

                case 'member_phone':
                    return $member->Phone ?? 'N/A';

                case 'membership_start_date':
                    return $member->MembershipStartDate
                        ? \Carbon\Carbon::parse($member->MembershipStartDate)->format('F j, Y')
                        : 'N/A';

                case 'expiry_date':
                    return $member->MembershipEndDate
                        ? \Carbon\Carbon::parse($member->MembershipEndDate)->format('F j, Y')
                        : 'N/A';

                case 'membership_card_number':
                    return $member->MembershipCardNumber ?? 'N/A';

                case 'membership_status':
                    // If there's a status relationship
                    return optional($member->status)->StatusName ?? 'N/A';

                case 'plan_name':
                    // If there's a plan relationship
                    return optional($member->plan)->PlanName ?? 'N/A';

                case 'gym_name':
                    // If you have a single gym name or fetch from config
                    return config('app.gym_name') ?? 'Contnental Fitness Gym';

                case 'branch_name':
                    // The branch where the member started or is assigned
                    return optional($member->startedBranch)->BranchName
                        ?? optional($member->branch)->BranchName
                        ?? 'N/A';


                // -- Coach & Session Variables --
                case 'coach_name':
                    // Example: get the *latest* session booking, with coach
                    $latestSession = $member->sessionBookings()
                        ->with('session.coach')
                        ->latest('BookingDate')
                        ->first();
                    return optional($latestSession->session->coach)->FullName ?? 'N/A';

                case 'coach_specialty':
                    $latestSession = $member->sessionBookings()
                        ->with('session.coach')
                        ->latest('BookingDate')
                        ->first();
                    return optional($latestSession->session->coach)->Specialty ?? 'N/A';

                case 'session_name':
                    $latestSession = $member->sessionBookings()
                        ->with('session')
                        ->latest('BookingDate')
                        ->first();
                    return optional($latestSession->session)->SessionName ?? 'N/A';

                case 'session_type':
                    $latestSession = $member->sessionBookings()
                        ->with('session')
                        ->latest('BookingDate')
                        ->first();
                    return optional($latestSession->session)->SessionType ?? 'N/A';

                case 'start_time':
                    $latestSession = $member->sessionBookings()
                        ->with('session')
                        ->latest('BookingDate')
                        ->first();
                    $start = optional($latestSession->session)->StartTime;
                    return $start
                        ? \Carbon\Carbon::parse($start)->format('F j, Y g:i A')
                        : 'N/A';

                case 'end_time':
                    $latestSession = $member->sessionBookings()
                        ->with('session')
                        ->latest('BookingDate')
                        ->first();
                    $end = optional($latestSession->session)->EndTime;
                    return $end
                        ? \Carbon\Carbon::parse($end)->format('F j, Y g:i A')
                        : 'N/A';

                case 'session_location':
                    $latestSession = $member->sessionBookings()
                        ->with('session')
                        ->latest('BookingDate')
                        ->first();
                    return optional($latestSession->session)->Location ?? 'N/A';

                case 'session_fee':
                    $latestSession = $member->sessionBookings()
                        ->with('session')
                        ->latest('BookingDate')
                        ->first();
                    return $latestSession && isset($latestSession->session->Fee)
                        ? number_format($latestSession->session->Fee, 2)
                        : '0.00';


                // -- Facility Booking Variables --
                case 'facility_name':
                    // Example: fetch the latest facility booking
                    $latestFacilityBooking = $member->bookings()
                        ->with('facility')
                        ->latest('BookingDate')
                        ->first();
                    return optional($latestFacilityBooking->facility)->FacilityName ?? 'N/A';

                case 'facility_branch':
                    $latestFacilityBooking = $member->bookings()
                        ->with('facility.branch')
                        ->latest('BookingDate')
                        ->first();
                    return optional($latestFacilityBooking->facility->branch)->BranchName ?? 'N/A';

                case 'booking_date':
                    // For a facility booking or session booking
                    $latestBooking = $member->bookings()->latest('BookingDate')->first();
                    if ($latestBooking && $latestBooking->BookingDate) {
                        return \Carbon\Carbon::parse($latestBooking->BookingDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'booking_time':
                    $latestBooking = $member->bookings()->latest('BookingDate')->first();
                    return $latestBooking && $latestBooking->BookingTime
                        ? $latestBooking->BookingTime
                        : 'N/A';

                case 'booking_duration':
                    $latestBooking = $member->bookings()->latest('BookingDate')->first();
                    return $latestBooking && $latestBooking->Duration
                        ? $latestBooking->Duration . ' mins'
                        : 'N/A';

                case 'guest_name':
                    $latestBooking = $member->bookings()->latest('BookingDate')->first();
                    return $latestBooking && $latestBooking->GuestName
                        ? $latestBooking->GuestName
                        : 'N/A';

                case 'guest_email':
                    $latestBooking = $member->bookings()->latest('BookingDate')->first();
                    return $latestBooking && $latestBooking->GuestEmail
                        ? $latestBooking->GuestEmail
                        : 'N/A';


                // -- Membership Freeze Variables --
                case 'freeze_start_date':
                    // e.g., fetch the most recent freeze
                    $freeze = $member->freezes()->latest('FreezeStartDate')->first();
                    if ($freeze && $freeze->FreezeStartDate) {
                        return \Carbon\Carbon::parse($freeze->FreezeStartDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'freeze_end_date':
                    $freeze = $member->freezes()->latest('FreezeEndDate')->first();
                    if ($freeze && $freeze->FreezeEndDate) {
                        return \Carbon\Carbon::parse($freeze->FreezeEndDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'freeze_reason':
                    $freeze = $member->freezes()->latest('FreezeStartDate')->first();
                    return $freeze->Reason ?? 'N/A';

                case 'original_end_date':
                    $freeze = $member->freezes()->latest('FreezeStartDate')->first();
                    if ($freeze && $freeze->OriginalEndDate) {
                        return \Carbon\Carbon::parse($freeze->OriginalEndDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'payment_status':
                    // This might be used in various contexts: freeze, payment, etc.
                    // We'll just guess: the member’s latest Payment->Status
                    $payment = $member->payments()->latest('PaymentDate')->first();
                    return $payment ? $payment->Status : 'N/A';


                // -- Membership Renewal & Plan Variables --
                case 'renewal_date':
                    $renewal = $member->renewals()->latest('RenewalDate')->first();
                    if ($renewal && $renewal->RenewalDate) {
                        return \Carbon\Carbon::parse($renewal->RenewalDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'renewal_start_date':
                    $renewal = $member->renewals()->latest('RenewalDate')->first();
                    if ($renewal && $renewal->RenewalStartDate) {
                        return \Carbon\Carbon::parse($renewal->RenewalStartDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'renewal_amount':
                    $renewal = $member->renewals()->latest('RenewalDate')->first();
                    return $renewal && $renewal->RenewalAmount
                        ? number_format($renewal->RenewalAmount, 2)
                        : '0.00';

                case 'renewal_instructions':
                    // Hardcode or store in config
                    return 'Please visit our website or front desk to renew.';

                case 'lock_in_months':
                    // If needed from the plan
                    return optional($member->plan)->LockInMonths
                        ? (string) $member->plan->LockInMonths
                        : 'N/A';


                // -- Payment & Invoice Variables --
                case 'payment_amount':
                    $latestPayment = $member->payments()->latest('PaymentDate')->first();
                    return $latestPayment && $latestPayment->Amount
                        ? number_format($latestPayment->Amount, 2)
                        : '0.00';

                case 'payment_date':
                    $latestPayment = $member->payments()->latest('PaymentDate')->first();
                    if ($latestPayment && $latestPayment->PaymentDate) {
                        return \Carbon\Carbon::parse($latestPayment->PaymentDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'payment_method':
                    $latestPayment = $member->payments()->latest('PaymentDate')->first();
                    return $latestPayment && $latestPayment->PaymentMethod
                        ? $latestPayment->PaymentMethod
                        : 'N/A';

                case 'failure_reason':
                    $latestPayment = $member->payments()->latest('PaymentDate')->first();
                    return $latestPayment->FailureReason ?? 'N/A';

                case 'invoice_number':
                    // Example: last invoice
                    $invoice = $member->invoices()->latest('InvoiceDate')->first();
                    return $invoice
                        ? 'INV-' . $invoice->InvoiceID
                        : 'N/A';

                case 'invoice_date':
                    $invoice = $member->invoices()->latest('InvoiceDate')->first();
                    if ($invoice && $invoice->InvoiceDate) {
                        return \Carbon\Carbon::parse($invoice->InvoiceDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'invoice_due_date':
                    $invoice = $member->invoices()->latest('InvoiceDate')->first();
                    if ($invoice && $invoice->DueDate) {
                        return \Carbon\Carbon::parse($invoice->DueDate)->format('F j, Y');
                    }
                    return 'N/A';

                case 'invoice_total':
                    $invoice = $member->invoices()->latest('InvoiceDate')->first();
                    return $invoice && $invoice->InvoiceTotal
                        ? number_format($invoice->InvoiceTotal, 2)
                        : '0.00';


                // -- Additional Gym Info & Defaults --
                case 'gym_phone':
                    return config('gym.phone') ?? '(555) 987-6543';

                case 'gym_email':
                    return config('gym.email') ?? 'info@contnentalfitness.com';

                case 'gym_website':
                    return config('gym.website') ?? 'https://contnentalfitness.com';

                case 'support_email':
                    return config('gym.support_email') ?? 'support@contnentalfitness.com';

                case 'customer_name':
                    // If you want to address a generic user
                    return 'Valued Customer';


                // -- If no matching case found, fallback --
                default:
                    return 'N/A';
            }
        } catch (\Exception $e) {
            // If any unexpected error occurs, log and return fallback
            \Log::error("Error resolving placeholder [$var]: " . $e->getMessage());
            return 'N/A';
        }
    }

    public function sendSemaphoreSMS(Request $request)
    {
        $data = $request->validate([
            'numbers'    => 'required|string', // Example: "09998887777,09171234567"
            'message'    => 'required|string',
            'senderName' => 'nullable|string',
        ]);
    
        $senderName = !empty($data['senderName']) ? $data['senderName'] : "CONTNENTAL";
    
        // Clean and normalize to 63 for sending
        $numbersArray = array_map(function ($number) {
            $cleanNumber = preg_replace('/\D/', '', $number);
            if (substr($cleanNumber, 0, 2) === '09') {
                $cleanNumber = '63' . substr($cleanNumber, 1);
            }
            return $cleanNumber;
        }, explode(',', $data['numbers']));
    
        if (empty($numbersArray)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No valid phone numbers provided'
            ], 422);
        }
    
        // Check API key
        $apiKey = config('services.semaphore.key');
        if (!$apiKey) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Missing Semaphore API Key'
            ], 500);
        }
    
        // Create a notification log for each phone number
        $notifs = [];
        foreach ($numbersArray as $phone) {
            // Convert 63 back to 09 for database lookup
            $localPhone = (substr($phone, 0, 2) === '63') ? '0' . substr($phone, 2) : $phone;
    
            $member = Member::where('Phone', $localPhone)->first();
            $memberId = $member ? $member->MemberID : null;
    
            $notifs[$phone] = Notification::create([
                'MemberID'           => $memberId,
                'EventTrigger'       => 'SemaphoreBatch',
                'Subject'            => 'SMS Notification',
                'Sender'             => $senderName,
                'Message'            => 'SMS queued: ' . $data['message'],
                'NotificationMethod' => 'SMS',
                'SentDate'           => now(),
                'Status'             => 'Sent',
            ]);
        }
    
        // Send actual SMS via Semaphore
        $postData = [
            'apikey'     => $apiKey,
            'number'     => implode(',', $numbersArray),
            'message'    => $data['message'],
            'sendername' => $senderName,
        ];
    
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->post('https://api.semaphore.co/api/v4/messages', [
                'form_params' => $postData,
            ]);
    
            $json = json_decode($response->getBody()->getContents(), true);
            \Log::info('Semaphore API Raw Response:', $json);
    
            foreach ($notifs as $row) {
                $row->update([
                    'Status'   => 'Sent',
                    'SentDate' => now(),
                ]);
            }
    
            return response()->json([
                'status'   => 'success',
                'message'  => "SMS sent successfully via system log.",
                'response' => $json,
            ]);
    
        } catch (\Exception $ex) {
            \Log::error('Semaphore API Error: ' . $ex->getMessage());
    
            foreach ($notifs as $row) {
                $row->update([
                    'Status'   => 'Failed',
                    'Message'  => $ex->getMessage(),
                    'SentDate' => now(),
                ]);
            }
    
            return response()->json([
                'status'  => 'error',
                'message' => 'Error sending SMS via Semaphore: ' . $ex->getMessage(),
            ], 500);
        }
    }
    

    public function notifyCoachOfBookingMailjet(Request $request)
    {
        $data = $request->validate([
            'coach_id'     => 'required|exists:coaches,CoachID',
            'coach_name'   => 'required|string|max:255',
            'coach_email'  => 'required|email',
            'member_name'  => 'required|string|max:255',
            'session_name' => 'required|string|max:255',
            'start_time'   => 'required|date_format:Y-m-d H:i:s',
            'end_time'     => 'required|date_format:Y-m-d H:i:s',
        ]);
    
        // Log the incoming data for debugging
        \Log::info('notifyCoachOfBookingMailjet - Request Data:', $data);
    
        // Use Carbon to parse the start and end times and format them in a human-readable format
        $startTimeFormatted = \Carbon\Carbon::parse($data['start_time'])->format('F j, Y g:i A');
        $endTimeFormatted   = \Carbon\Carbon::parse($data['end_time'])->format('F j, Y g:i A');
    
        // Initialize the Mailjet client
        $mj = new \Mailjet\Client(
            config('services.mailjet.api_key'),
            config('services.mailjet.secret_key'),
            true,
            ['version' => 'v3.1']
        );
    
        $templateID = 6806665; // Make sure this template is active and published
    
        // Build the messages array
        $messages = [];
        $messages[] = [
            'From' => [
                'Email' => config('services.mailjet.from.address'),
                'Name'  => config('services.mailjet.from.name'),
            ],
            'To' => [
                [
                    'Email' => $data['coach_email'],
                    'Name'  => $data['coach_name'],
                ]
            ],
            'TemplateID'       => $templateID,
            'TemplateLanguage' => true,
            'Subject'          => 'Contnental Fitness Gym',
            'Variables'        => [
                'coach_name'   => $data['coach_name'],
                'member_name'  => $data['member_name'],
                'session_name' => $data['session_name'],
                'start_time'   => $startTimeFormatted,
                'end_time'     => $endTimeFormatted,
            ],
        ];
    
        \Log::info('notifyCoachOfBookingMailjet - Messages Array:', $messages);
    
        // Chunk messages into batches of 50 (even if there's only one message)
        $chunks = array_chunk($messages, 50);
        $overallSuccess = 0;
        $overallFailed  = 0;
        $responses = [];
        
        foreach ($chunks as $chunk) {
            $body = ['Messages' => $chunk];
            $response = $mj->post(\Mailjet\Resources::$Email, ['body' => $body]);
            $responseData = $response->getData();
        
            foreach ($responseData['Messages'] as $msg) {
                if (isset($msg['Status']) && strtolower($msg['Status']) === 'success') {
                    $overallSuccess++;
                } else {
                    $overallFailed++;
                }
            }
            $responses[] = $responseData;
        }
        
        if ($overallFailed === 0) {
            \App\Models\Notification::create([
                'MemberID'           => null,
                'EventTrigger'       => 'CoachBookedMailjet',
                'Message'            => "Coach #{$data['coach_id']} => Booked email sent to {$data['coach_email']}",
                'NotificationMethod' => 'Email',
                'SentDate'           => now(),
                'Status'             => 'Sent',
            ]);
            \Log::info('notifyCoachOfBookingMailjet - Email Sent Successfully.', $data);
        
            return response()->json([
                'status'  => 'success',
                'message' => 'Coach booking email sent via Mailjet.',
            ]);
        }
        
        \Log::error('notifyCoachOfBookingMailjet - Mailjet Error:', $responses);
        return response()->json([
            'status'  => 'error',
            'message' => 'Mailjet error when sending to coach.',
            'data'    => $responses,
        ], 500);
    }
    
    public function notifyMemberOfBookingMailjet(Request $request)
    {
        // Validate incoming request data for member notification
        $data = $request->validate([
            'member_id'    => 'required|exists:members,MemberID',
            'member_name'  => 'required|string|max:255',
            'member_email' => 'required|email',
            'coach_name'   => 'required|string|max:255',
            'session_name' => 'required|string|max:255',
            'start_time'   => 'required|date_format:Y-m-d H:i:s',
            'end_time'     => 'required|date_format:Y-m-d H:i:s',
        ]);

        // Log incoming request data for debugging
        \Log::info('notifyMemberOfBookingMailjet - Request Data:', $data);

        // Use Carbon to parse and format start and end times
        $startTimeParsed = \Carbon\Carbon::parse($data['start_time'])->format('F j, Y g:i A');
        $endTimeParsed  = \Carbon\Carbon::parse($data['end_time'])->format('F j, Y g:i A');
        
        // Initialize the Mailjet client
        $mj = new \Mailjet\Client(
            config('services.mailjet.api_key'),
            config('services.mailjet.secret_key'),
            true,
            ['version' => 'v3.1']
        );

        // Set the Mailjet template ID for the member notification (update this ID as needed)
        $templateID =6807609; // Replace with your actual Mailjet template ID for member notifications

        // Build the messages array (using the same logic as in your expiring-members function)
        $messages = [];
        $messages[] = [
            'From' => [
                'Email' => config('services.mailjet.from.address'),
                'Name'  => config('services.mailjet.from.name'),
            ],
            'To' => [
                [
                    'Email' => $data['member_email'],
                    'Name'  => $data['member_name'],
                ]
            ],
            'TemplateID'       => $templateID,
            'TemplateLanguage' => true,
            'Subject'          => 'Your Session Booking Confirmation',
            'Variables'        => [
                'member_name'  => $data['member_name'],
                'coach_name'   => $data['coach_name'],
                'session_name' => $data['session_name'],
                'start_time'   => $startTimeParsed,
                'end_time'     => $endTimeParsed,
            ],
        ];

        \Log::info('notifyMemberOfBookingMailjet - Messages Array:', $messages);

        // Chunk messages into batches of 50 (this allows you to scale if needed)
        $chunks = array_chunk($messages, 50);
        $overallSuccess = 0;
        $overallFailed  = 0;
        $responses = [];

        foreach ($chunks as $chunk) {
            $body = ['Messages' => $chunk];
            $response = $mj->post(\Mailjet\Resources::$Email, ['body' => $body]);
            $responseData = $response->getData();

            foreach ($responseData['Messages'] as $msg) {
                if (isset($msg['Status']) && strtolower($msg['Status']) === 'success') {
                    $overallSuccess++;
                } else {
                    $overallFailed++;
                }
            }
            $responses[] = $responseData;
        }

        if ($overallFailed === 0) {
            // Log the notification in your database
            \App\Models\Notification::create([
                'MemberID'           => $data['member_id'],
                'EventTrigger'       => 'MemberBookedMailjet',
                'Message'            => "Member #{$data['member_id']} => Booking confirmation email sent to {$data['member_email']}",
                'NotificationMethod' => 'Email',
                'SentDate'           => now(),
                'Status'             => 'Sent',
            ]);

            \Log::info('notifyMemberOfBookingMailjet - Email Sent Successfully.', $data);

            return response()->json([
                'status'  => 'success',
                'message' => 'Member booking confirmation email sent via Mailjet.',
            ]);
        }

        \Log::error('notifyMemberOfBookingMailjet - Mailjet Error:', $responses);
        return response()->json([
            'status'  => 'error',
            'message' => 'Mailjet error when sending to member.',
            'data'    => $responses,
        ], 500);
    }


    public function getMailjetActivityLogs(Request $request)
    {
        // Retrieve notifications that represent Mailjet email sends.
        // Include NotificationID to use as the unique row id.
        $logs = Notification::where('EventTrigger', 'MailjetBatch')
                ->orderBy('NotificationID', 'desc')
                ->get(['NotificationID', 'MemberID', 'Status', 'SentDate as timestamp', 'Message']);
    
        return response()->json(['logs' => $logs]);
    }
    public function getSemaphoreActivityLogs()
    {
        $logs = \App\Models\Notification::where('EventTrigger', 'SemaphoreBatch')
                    ->orderBy('NotificationID', 'desc')
                    ->get(['NotificationID', 'MemberID', 'Status', 'SentDate as timestamp', 'Message']);
        return response()->json(['logs' => $logs]);
    }
    

    
}
