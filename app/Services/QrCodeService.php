<?php

namespace App\Services;

use App\Models\Member;

class QrCodeService
{
    /**
     * Generate a unique QR code string for a member
     * This will be their permanent member ID
     * 
     * @param Member $member
     * @return string
     */
    public function generateMemberQrCode(Member $member): string
    {
        // Use membership card number as permanent ID
        // Strip any non-numeric characters
        return preg_replace('/\D/', '', $member->MembershipCardNumber);
    }
    
    /**
     * Verify the QR code and return member information if valid
     * 
     * @param string $qrCode
     * @return array|null
     */
    public function verifyQrCode(string $qrCode): ?array
    {
        // Find member by their numeric membership card ID
        $member = Member::whereRaw("REGEXP_REPLACE(MembershipCardNumber, '[^0-9]', '') = ?", [$qrCode])->first();
    
        if (!$member) {
            return null;
        }
        
        return [
            'member' => $member,
            'code_data' => [
                'membership_card_number' => $member->MembershipCardNumber,
            ]
        ];
    }
    
    /**
     * Generate a data URL for a QR code
     * 
     * @param string $qrCode
     * @return string
     */
    public function generateQrCodeImage(string $qrCode): string
    {
        $encodedData = urlencode($qrCode);
        return "https://api.qrserver.com/v1/create-qr-code/?size=250x250&ecc=H&qzone=4&format=png&data=" . $encodedData;
    }
} 