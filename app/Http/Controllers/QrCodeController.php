<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\MemberVisit;
use App\Services\QrCodeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class QrCodeController extends Controller
{
    protected $qrCodeService;
    
    public function __construct(QrCodeService $qrCodeService)
    {
        $this->qrCodeService = $qrCodeService;
    }
    
    /**
     * Generate a QR code for a member
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function generateQrCode(Request $request): JsonResponse
    {
        $request->validate([
            'member_id' => 'required|exists:members,MemberID',
            'validity_days' => 'sometimes|integer|min:1|max:365',
        ]);
        
        $memberId = $request->input('member_id');
        $validityDays = $request->input('validity_days', 30);
        
        $member = Member::findOrFail($memberId);
        
        try {
            // Generate QR code
            $member->generateNewQrCode($validityDays);
            
            return response()->json([
                'success' => true,
                'message' => 'QR code generated successfully',
                'qr_code_image' => $member->getQrCodeImageUrl(),
                'expires_at' => $member->QrCodeExpiry,
            ]);
        } catch (\Exception $e) {
            Log::error('QR code generation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate QR code',
            ], 500);
        }
    }
    
    /**
     * Generate a QR code for a member with ID
     * 
     * @param int $memberId
     * @param Request $request
     * @return JsonResponse
     */
    public function generateMemberQrCode(int $memberId, Request $request): JsonResponse
    {
        $member = Member::findOrFail($memberId);
        
        try {
            // Generate a simple QR code without validity
            $qrData = $this->qrCodeService->generateMemberQrCode($member);
            
            return response()->json([
                'success' => true,
                'message' => 'QR code generated successfully',
                'qr_code_data' => $qrData,
                'qr_code_image' => $this->qrCodeService->generateQrCodeImage($qrData)
            ]);
        } catch (\Exception $e) {
            Log::error('QR code generation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate QR code',
            ], 500);
        }
    }
    
    /**
     * Verify a QR code and check in a member
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyQrCode(Request $request): JsonResponse
    {
        $request->validate([
            'qr_code' => 'required|string',
            'branch_id' => 'required|exists:branches,BranchID',
        ]);
        
        $qrCode = $request->input('qr_code');
        $branchId = $request->input('branch_id');
        
        try {
            // Verify QR code
            $result = $this->qrCodeService->verifyQrCode($qrCode);
            
            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid QR code',
                ], 400);
            }
            
            $member = $result['member'];
            
            return response()->json([
                'success' => true,
                'message' => 'Member verified successfully',
                'member' => [
                    'id' => $member->MemberID,
                    'name' => $member->FullName,
                    'email' => $member->Email,
                    'membership_end_date' => $member->MembershipEndDate,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('QR code verification error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify QR code',
            ], 500);
        }
    }
    
    /**
     * Perform check-in with a QR code
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function checkInWithQrCode(Request $request): JsonResponse
    {
        $request->validate([
            'member_id' => 'required|exists:members,MemberID',
            'branch_id' => 'required|exists:branches,BranchID',
        ]);
        
        $memberId = $request->input('member_id');
        $branchId = $request->input('branch_id');
        
        try {
            $member = Member::findOrFail($memberId);
            
            // Record the visit
            $visit = new MemberVisit([
                'BranchID' => $branchId,
                'MemberID' => $member->MemberID,
                'VisitDate' => now()->toDateString(),
                'VisitTime' => now()->toTimeString(),
                'CheckInMethod' => 'QR Code',
                'Remarks' => 'Checked in using QR code',
            ]);
            
            $visit->save();
            
            return response()->json([
                'success' => true,
                'message' => 'Member checked in successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('QR code check-in error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to check in member',
            ], 500);
        }
    }
    
    /**
     * Get QR code details for a member
     * 
     * @param int $memberId
     * @return JsonResponse
     */
    public function getMemberQrCode(int $memberId): JsonResponse
    {
        try {
            $member = Member::findOrFail($memberId);
            
            // Generate permanent QR code using membership number
            $qrCodeData = $this->qrCodeService->generateMemberQrCode($member);
            $qrCodeImage = $this->qrCodeService->generateQrCodeImage($qrCodeData);
            
            return response()->json([
                'success' => true,
                'qr_code_data' => $qrCodeData,
                'qr_code_image' => $qrCodeImage,
                'message' => 'Permanent QR code generated successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating QR code: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate QR code'
            ], 500);
        }
    }
    
    /**
     * Revoke a member's QR code - This method is now deprecated as QR codes are permanent
     * Keeping for backwards compatibility
     * 
     * @param int $memberId
     * @return JsonResponse
     */
    public function revokeQrCode(int $memberId): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'QR code revocation is no longer supported as QR codes are now permanent member IDs',
        ]);
    }
    
    /**
     * Email a QR code to a member
     * 
     * @param int $memberId
     * @param Request $request
     * @return JsonResponse
     */
    public function emailQrCodeToMember(int $memberId, Request $request): JsonResponse
    {
        try {
            $member = Member::findOrFail($memberId);
            
            // Generate QR code using membership number
            $qrCodeData = $this->qrCodeService->generateMemberQrCode($member);
            $qrCodeImage = $this->qrCodeService->generateQrCodeImage($qrCodeData);
            
            if (empty($qrCodeImage)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate QR code image',
                ], 500);
            }
            
            if (empty($member->Email)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Member does not have an email address',
                ], 400);
            }
            
            // Prepare email variables
            $variables = [
                'member_name' => $member->FullName ?? 'Valued Member',
                'member_email' => $member->Email ?? '',
                'membership_id' => $member->MembershipCardNumber ?? '',
                'plan_name' => optional($member->plan)->PlanName ?? 'Your membership',
                'gym_name' => config('app.gym_name') ?? 'Contnental Fitness Gym',
                'branch_name' => optional($member->branch)->BranchName ?? 'Our gym',
                'qr_code_image' => $qrCodeImage,
            ];
            
            try {
                // Setup Mailjet client
                $mj = new \Mailjet\Client(
                    config('services.mailjet.api_key'),
                    config('services.mailjet.secret_key'),
                    true,
                    ['version' => 'v3.1']
                );
                
                if (empty(config('services.mailjet.api_key')) || empty(config('services.mailjet.secret_key'))) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Mailjet API credentials are missing',
                    ], 500);
                }
                
                // Create email body
                $body = [
                    'Messages' => [
                        [
                            'From' => [
                                'Email' => config('services.mailjet.from.address'),
                                'Name' => config('services.mailjet.from.name'),
                            ],
                            'To' => [
                                ['Email' => $member->Email, 'Name' => $member->FullName],
                            ],
                            'Subject' => 'Your Contnental Fitness Gym Member QR Code',
                            'HTMLPart' => $this->getQrCodeEmailTemplate($variables)
                        ]
                    ]
                ];
                
                // Record notification in database
                $notification = new \App\Models\Notification([
                    'MemberID' => $member->MemberID,
                    'EventTrigger' => 'QrCodeGeneration',
                    'Subject' => 'Member QR Code',
                    'Sender' => config('services.mailjet.from.name'),
                    'Message' => 'Your permanent member QR code has been emailed to you.',
                    'NotificationMethod' => 'Email',
                    'SentDate' => now(),
                    'Status' => 'Queued',
                ]);
                $notification->save();
                
                // Send email via Mailjet
                $response = $mj->post(\Mailjet\Resources::$Email, ['body' => $body]);
                
                if ($response->success()) {
                    $notification->update([
                        'Status' => 'Sent',
                        'SentDate' => now(),
                    ]);
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'QR code emailed successfully'
                    ]);
                } else {
                    $errorData = $response->getData();
                    $errorMsg = 'Unknown Mailjet error';
                    
                    if (isset($errorData['ErrorMessage'])) {
                        $errorMsg = $errorData['ErrorMessage'];
                    } elseif (isset($errorData['errors']) && !empty($errorData['errors'])) {
                        $errorMsg = is_array($errorData['errors'][0]) 
                            ? ($errorData['errors'][0]['ErrorMessage'] ?? json_encode($errorData['errors'][0]))
                            : $errorData['errors'][0];
                    } elseif (isset($errorData['Messages']) && !empty($errorData['Messages']) && isset($errorData['Messages'][0]['Errors'])) {
                        $errorMsg = $errorData['Messages'][0]['Errors'][0]['ErrorMessage'] ?? json_encode($errorData['Messages'][0]['Errors']);
                    }
                    
                    $notification->update([
                        'Status' => 'Failed',
                        'Message' => 'Failed to send: ' . $errorMsg,
                        'SentDate' => now(),
                    ]);
                    
                    \Log::error('Mailjet error: ' . json_encode($errorData));
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to email QR code: ' . $errorMsg,
                        'error_details' => $errorData
                    ], 500);
                }
            } catch (\Exception $e) {
                \Log::error('Email sending error: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to send email: ' . $e->getMessage(),
                ], 500);
            }
        } catch (\Exception $e) {
            \Log::error('QR code generation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate and email QR code: ' . $e->getMessage(),
            ], 500);
        }
    }
    
    /**
     * Generate a PDF with QR code and member details
     * 
     * @param Member $member
     * @param string $qrCodeImageUrl
     * @return \FPDF
     */
    protected function generateQrCodePdf(Member $member, string $qrCodeImageUrl)
    {
        // Create PDF using FPDF
        $pdf = new \FPDF();
        $pdf->AddPage();
        
        // Set font
        $pdf->SetFont('Arial', 'B', 16);
        
        // Add gym logo/header
        $pdf->SetFillColor(33, 150, 243); // Material blue
        $pdf->Rect(0, 0, 210, 30, 'F');
        $pdf->SetTextColor(255, 255, 255);
        $pdf->Cell(0, 20, 'Contnental Fitness Gym', 0, 1, 'C');
        
        // Reset text color
        $pdf->SetTextColor(0, 0, 0);
        
        // Add member info
        $pdf->Ln(10);
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 10, 'QR Code for: ' . $member->FullName, 0, 1, 'C');
        
        // Member ID and other details
        $pdf->SetFont('Arial', '', 12);
        $pdf->Ln(5);
        $pdf->Cell(0, 8, 'Member ID: ' . $member->MemberID, 0, 1, 'C');
        $pdf->Cell(0, 8, 'Membership Type: ' . (optional($member->plan)->PlanName ?? 'Regular'), 0, 1, 'C');
        
        // Add expiry info
        $pdf->Ln(5);
        $pdf->SetFont('Arial', 'B', 12);
        $expiryDate = \Carbon\Carbon::parse($member->QrCodeExpiry)->format('F j, Y g:i A');
        $pdf->Cell(0, 8, 'QR Code Valid Until: ' . $expiryDate, 0, 1, 'C');
        
        // Skip image insertion and just add a placeholder text
        $pdf->Ln(20);
        $pdf->Cell(0, 10, 'Your QR Code Is Available In This Email', 0, 1, 'C');
        $pdf->Ln(20);
        
        // Instructions
        $pdf->Ln(20); // Space after QR code
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 10, 'How to use your QR Code:', 0, 1, 'C');
        
        $pdf->SetFont('Arial', '', 11);
        $pdf->Cell(0, 8, '1. Save this PDF or take a screenshot of the QR code', 0, 1, 'C');
        $pdf->Cell(0, 8, '2. Present the QR code on your mobile device at check-in', 0, 1, 'C');
        $pdf->Cell(0, 8, '3. Staff will scan your code for quick and contactless entry', 0, 1, 'C');
        
        // Footer
        $pdf->Ln(10);
        $pdf->SetFont('Arial', 'I', 10);
        $pdf->Cell(0, 10, 'Thank you for being a member of Contnental Fitness Gym!', 0, 1, 'C');
        
        return $pdf;
    }
    
    /**
     * Get HTML email template for QR code email
     * 
     * @param array $variables
     * @return string
     */
    protected function getQrCodeEmailTemplate(array $variables): string
    {
        // Ensure QR code is visible - make it mobile friendly
        $qrCodeHtml = 'QR Code Not Available';
        if (isset($variables['qr_code_image'])) {
            $qrCodeHtml = '<img src="' . $variables['qr_code_image'] . '" alt="QR Code" style="width: 250px; height: 250px; border: 1px solid #ddd; padding: 10px; background: white;">
            <div style="margin-top: 10px; font-size: 12px; color: #666;">If you cannot see the QR code image above, please enable images in your email client.</div>';
        }

        // Get the full URL for the logo
        $logoUrl = url('/imgs/logo-mainb.png');

        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Gym Member QR Code</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #ffffff;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background-color: #000000;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }
                .logo {
                    max-width: 180px;
                    margin: 0 auto;
                    display: block;
                }
                .content {
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 0 0 5px 5px;
                    border: 1px solid #e0e0e0;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 12px;
                    color: #777;
                }
                h1 { color: #000000; }
                .highlight {
                    background-color: #f5f5f5;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #000000;
                }
                .qr-code-container {
                    text-align: center;
                    margin: 30px 0;
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #000000;
                }
                .qr-code-title {
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #000000;
                    font-size: 18px;
                }
                .member-id {
                    background-color: #f8f8f8;
                    padding: 10px;
                    border-radius: 4px;
                    margin: 15px 0;
                    font-family: monospace;
                    font-size: 16px;
                }
                .scan-tip {
                    margin-top: 15px;
                    padding: 10px;
                    background-color: #f9f9f9;
                    border-radius: 4px;
                    font-size: 14px;
                }
                @media screen and (max-width: 480px) {
                    .qr-code-container img {
                        width: 200px;
                        height: 200px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="' . $logoUrl . '" alt="Contnental Fitness Gym" class="logo">
                </div>
                
                <div class="content">
                    <h1>Your Member QR Code</h1>
                    
                    <p>Hello ' . ($variables['member_name'] ?? 'Valued Member') . ',</p>
                    
                    <p>Here is your permanent member QR code for ' . ($variables['branch_name'] ?? 'our gym') . '. This QR code serves as your digital member ID card for quick and easy check-in.</p>
                    
                    <div class="highlight">
                        <strong>Member ID: </strong>' . ($variables['membership_id'] ?? 'N/A') . '
                    </div>
                    
                    <div class="qr-code-container">
                        <div class="qr-code-title">Your Permanent Member QR Code</div>
                        ' . $qrCodeHtml . '
                        <div class="scan-tip">
                            <strong>For best scanning results:</strong> Hold your phone steady and ensure the QR code is well-lit and fills the camera frame.
                        </div>
                    </div>
                    
                    <h3>Important Information:</h3>
                    <ul>
                        <li>This is your permanent member QR code - it will not expire</li>
                        <li>Save this QR code to your phone for easy access</li>
                        <li>You can use this QR code at any time to check in</li>
                        <li>Do not share your QR code with others</li>
                    </ul>
                    
                    <p>For ' . ($variables['plan_name'] ?? 'your membership') . ' members, this QR code provides quick access to all gym facilities.</p>
                    
                    <p>If you have any questions or need assistance, please don\'t hesitate to contact our staff.</p>
                    
                    <p>Stay fit and healthy!</p>
                    
                    <p>The ' . ($variables['gym_name'] ?? 'Contnental Fitness Gym') . ' Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; ' . date('Y') . ' ' . ($variables['gym_name'] ?? 'Contnental Fitness Gym') . '. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        ';
    }
    
    /**
     * Debug Mailjet configuration
     * 
     * @return JsonResponse
     */
    public function debugMailjetConfig(): JsonResponse
    {
        $config = [
            'api_key' => config('services.mailjet.api_key') ? 'Set (length: ' . strlen(config('services.mailjet.api_key')) . ')' : 'Not set',
            'secret_key' => config('services.mailjet.secret_key') ? 'Set (length: ' . strlen(config('services.mailjet.secret_key')) . ')' : 'Not set',
            'from_address' => config('services.mailjet.from.address') ?: 'Not set',
            'from_name' => config('services.mailjet.from.name') ?: 'Not set',
            'php_version' => phpversion(),
            'fpdf_installed' => class_exists('\FPDF') ? 'Yes' : 'No',
            'qrcode_service' => class_exists('\App\Services\QrCodeService') ? 'Yes' : 'No',
            'gd_installed' => extension_loaded('gd') ? 'Yes' : 'No',
            'temp_dir' => sys_get_temp_dir(),
            'temp_dir_writable' => is_writable(sys_get_temp_dir()) ? 'Yes' : 'No',
        ];
        
        return response()->json([
            'success' => true,
            'config' => $config
        ]);
    }
} 