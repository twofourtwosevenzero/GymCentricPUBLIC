<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity as SpatieActivity;
use Webauthn\PublicKeyCredentialSource;
use Webauthn\PublicKeyCredentialUserEntity;
use Webauthn\TrustPath\EmptyTrustPath;
use Webauthn\TrustPath\TrustPath;
use Symfony\Component\Uid\Uuid;
use Ramsey\Uuid\Uuid as RamseyUuid;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class Member extends Model
{
    use LogsActivity;
    
    protected $table = 'members';
    protected $primaryKey = 'MemberID';

    protected $fillable = [
        'FullName',
        'Email',
        'Phone',
        'PlanID',
        'MembershipCardNumber',
        'MembershipCardIssued',
        'MembershipStartDate',
        'MembershipEndDate',
        'LockedInEndDate', // add this
        'Biometrics',
        'QrCodeData',      // QR code encrypted data
        'QrCodeExpiry',    // QR code expiry date
        'PhotoPath',
        'FreeSessions',
        'Notes',
        'StartedBranchID',
        'BranchID',
        'MemberStatusID',
    ];

    protected $casts = [
        'MembershipStartDate' => 'datetime',
        'MembershipEndDate' => 'datetime',
        'LockedInEndDate' => 'datetime',
        'QrCodeExpiry' => 'datetime',
        'MembershipCardIssued' => 'boolean',
    ];

    // Relationship: A member started at one branch
    public function startedBranch()
    {
        return $this->belongsTo(Branch::class, 'StartedBranchID', 'BranchID');
    }

    // Relationship: A member belongs to a membership plan
    public function plan()
    {
        return $this->belongsTo(MembershipPlan::class, 'PlanID', 'PlanID');
    }

    // Relationship: A member can have many renewals
    public function renewals()
    {
        return $this->hasMany(MembershipRenewal::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can have many freezes
    public function freezes()
    {
        return $this->hasMany(MembershipFreeze::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can have many change logs
    public function changeLogs()
    {
        return $this->hasMany(MembershipChangeLog::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can have many payments
    public function payments()
    {
        return $this->hasMany(Payment::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can book facilities
    public function bookings()
    {
        return $this->hasMany(Booking::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can receive notifications
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can have multiple locker usages
    public function lockerUsages()
    {
        return $this->hasMany(LockerUsage::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member has many session bookings
    public function sessionBookings()
    {
        return $this->hasMany(SessionBooking::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can appear in session attendance
    public function sessionAttendances()
    {
        return $this->hasMany(SessionAttendance::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can be in a session waitlist
    public function sessionWaitlists()
    {
        return $this->hasMany(SessionWaitlist::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member can have multiple visits
    public function visits()
    {
        return $this->hasMany(MemberVisit::class, 'MemberID', 'MemberID');
    }

    // Relationship: A member belongs to a status
    public function status()
    {
        return $this->belongsTo(MemberStatus::class, 'MemberStatusID', 'MemberStatusID');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('member')
            ->setDescriptionForEvent(fn ($eventName) => "Member record has been {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    /**
     * This is called right before the activity record is saved.
     * We add 'branch_id' into properties from $this->StartedBranchID.
     */
    public function tapActivity(SpatieActivity $activity, string $eventName)
    {
        $branchId = $this->StartedBranchID ?? null;
        $activity->properties = $activity->properties->put('branch_id', $branchId);
    }


    public function getWebAuthnUserEntity(): PublicKeyCredentialUserEntity
    {
        // The ID must be a string, convert MemberID to a string
        $id = (string) $this->MemberID;
        
        // Create a new user entity with the member's details
        return new PublicKeyCredentialUserEntity(
            $this->FullName,
            $id,
            $this->Email ?? $this->FullName,
            null // No display name
        );
    }


/**
 * Save a WebAuthn credential.
 */
public function saveWebAuthnCredential(PublicKeyCredentialSource $credential): bool
{
    $credentials = empty($this->Biometrics) ? [] : json_decode($this->Biometrics, true);
    $credentialIds = array_map(function ($data) {
        return base64_decode($data['id']);
    }, $credentials);

    // Create an array with the credential data
    $credential_array = [
        'id' => base64_encode($credential->publicKeyCredentialId),
        'type' => $credential->type,
        'transports' => $credential->transports,
        'attestationType' => $credential->attestationType,
        'trustPath' => [
            'type' => get_class($credential->trustPath),
            'data' => $this->serializeTrustPath($credential->trustPath)
        ],
        'aaguid' => base64_encode($credential->aaguid->toBinary()),
        'credentialPublicKey' => base64_encode($credential->credentialPublicKey),
        'userHandle' => base64_encode($credential->userHandle),
        'counter' => $credential->counter,
    ];

    // Check if we're updating an existing credential
    $existingIndex = $this->findWebAuthnCredential($credential->publicKeyCredentialId, $credentialIds);
    if ($existingIndex !== false) {
        $credentials[$existingIndex] = $credential_array;
    } else {
        $credentials[] = $credential_array;
    }

    $this->Biometrics = json_encode($credentials);
    return $this->save();
}

/**
 * Helper to serialize TrustPath objects
 */
private function serializeTrustPath(TrustPath $trustPath): array
{
    if ($trustPath instanceof EmptyTrustPath) {
        return [];
    }
    
    $data = [];
    $reflection = new \ReflectionClass($trustPath);
    
    foreach ($reflection->getProperties() as $property) {
        $property->setAccessible(true);
        $value = $property->getValue($trustPath);
        
        // Handle different types of data
        if (is_object($value)) {
            if (method_exists($value, 'jsonSerialize')) {
                $data[$property->getName()] = $value->jsonSerialize();
            } elseif (method_exists($value, '__toString')) {
                $data[$property->getName()] = (string)$value;
            } else {
                $data[$property->getName()] = get_object_vars($value);
            }
        } else {
            $data[$property->getName()] = $value;
        }
    }
    
    return $data;
}

/**
 * Get all WebAuthn credentials.
 */
public function getWebAuthnCredentials(): array
{
    if (empty($this->Biometrics)) {
        return [];
    }

    $credentials = json_decode($this->Biometrics, true);

    return array_map(
        function ($data) {
            // For WebAuthn 5.1, we need to convert our stored data back to a PublicKeyCredentialSource
            // First, decode the base64 encoded fields
            if (isset($data['id'])) {
                $data['id'] = base64_decode($data['id']);
            }
            
            // Process AAGUID - convert to a Uuid object
            try {
                $aaguidBinary = isset($data['aaguid']) && !empty($data['aaguid']) 
                    ? base64_decode($data['aaguid'])
                    : "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"; // 16 null bytes
                
                // Use Symfony Uuid as it seems to be the one imported
                $aaguid = Uuid::fromString(bin2hex(substr($aaguidBinary, 0, 16)));
            } catch (\Exception $e) {
                // Fallback to a null UUID if conversion fails
                $aaguid = Uuid::fromString('00000000-0000-0000-0000-000000000000');
            }
            
            // Process TrustPath - create the appropriate TrustPath object
            $trustPath = new EmptyTrustPath();
            if (isset($data['trustPath']) && is_array($data['trustPath']) && isset($data['trustPath']['type'])) {
                try {
                    $trustPathType = $data['trustPath']['type'];
                    $trustPathData = $data['trustPath']['data'] ?? [];
                    
                    // If this is an EmptyTrustPath, use that directly
                    if ($trustPathType === EmptyTrustPath::class) {
                        $trustPath = new EmptyTrustPath();
                    } 
                    // For other types, if they have a static create or fromArray method, try to use that
                    elseif (class_exists($trustPathType) && method_exists($trustPathType, 'create')) {
                        $trustPath = $trustPathType::create(...array_values($trustPathData));
                    }
                    elseif (class_exists($trustPathType) && method_exists($trustPathType, 'fromArray')) {
                        $trustPath = $trustPathType::fromArray($trustPathData);
                    }
                    // Last resort: try to instantiate directly
                    elseif (class_exists($trustPathType)) {
                        $trustPath = new $trustPathType();
                    }
                } catch (\Exception $e) {
                    // If anything fails, use an EmptyTrustPath
                    $trustPath = new EmptyTrustPath();
                }
            }
            
            if (isset($data['credentialPublicKey'])) {
                $data['credentialPublicKey'] = base64_decode($data['credentialPublicKey']);
            }
            if (isset($data['userHandle'])) {
                $data['userHandle'] = base64_decode($data['userHandle']);
            }
            
            // In WebAuthn 5.1, PublicKeyCredentialSource has a static 'create' method instead of 'createFromArray'
            return PublicKeyCredentialSource::create(
                $data['id'] ?? '', // This becomes the publicKeyCredentialId
                $data['type'] ?? 'public-key',
                $data['transports'] ?? [],
                $data['attestationType'] ?? 'none',
                $trustPath,
                $aaguid,
                $data['credentialPublicKey'] ?? '',
                $data['userHandle'] ?? '',
                $data['counter'] ?? 0
            );
        },
        $credentials
    );
}

/**
 * Get all WebAuthn credential IDs.
 */
public function getCredentialIds(): array
{
    if (empty($this->Biometrics)) {
        return [];
    }

    $credentials = json_decode($this->Biometrics, true);
    
    return array_map(function ($data) {
        return base64_decode($data['id']);
    }, $credentials);
}

/**
 * Find the index of a WebAuthn credential by ID.
 */
private function findWebAuthnCredential(string $credentialId, array $credentialIds): bool|int
{
    foreach ($credentialIds as $index => $id) {
        if ($id === $credentialId) {
            return $index;
        }
    }
    
    return false;
}

/**
 * Find a WebAuthn credential by ID.
 */
public function findCredentialById(string $credentialId): ?PublicKeyCredentialSource
{
    $credentials = $this->getWebAuthnCredentials();
    
    foreach ($credentials as $credential) {
        if (hash_equals($credential->publicKeyCredentialId, $credentialId)) {
            return $credential;
        }
    }
    
    return null;
}

/**
 * Generate a new QR code for this member
 * 
 * @param int $validityInDays Days until QR code expires
 * @return bool Success status
 */
public function generateNewQrCode(int $validityInDays = 30): bool
{
    $qrService = app(\App\Services\QrCodeService::class);
    
    // Generate new QR code data
    $qrCodeData = $qrService->generateMemberQrCode($this, $validityInDays);
    
    // Update the member record
    $this->QrCodeData = $qrCodeData;
    $this->QrCodeExpiry = Carbon::now()->addDays($validityInDays);
    
    return $this->save();
}

/**
 * Check if the member has a valid QR code
 * 
 * @return bool
 */
public function hasValidQrCode(): bool
{
    return !empty($this->QrCodeData) && 
           $this->QrCodeExpiry && 
           Carbon::parse($this->QrCodeExpiry)->isFuture();
}

/**
 * Get the QR code image data URL
 * 
 * @return string|null
 */
public function getQrCodeImageUrl(): ?string
{
    if (!$this->hasValidQrCode()) {
        return null;
    }
    
    $qrService = app(\App\Services\QrCodeService::class);
    return $qrService->generateQrCodeImage($this->QrCodeData);
}
}
