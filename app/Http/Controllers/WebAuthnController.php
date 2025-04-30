<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\MemberVisit;
use App\Services\PublicKeyCredentialLoader;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\PublicKeyCredentialDescriptor;
use Webauthn\PublicKeyCredentialParameters;
use Webauthn\PublicKeyCredentialRequestOptions;
use Webauthn\PublicKeyCredentialRpEntity;
use Webauthn\AuthenticatorSelectionCriteria;
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\AuthenticatorAssertionResponseValidator;
use Webauthn\PublicKeyCredential;
use WebAuthn\Bundle\Repository\PublicKeyCredentialSourceRepositoryInterface;

class WebAuthnController extends Controller
{
    /**
     * Generate registration options for a member.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateRegistrationOptions(Request $request): JsonResponse
    {
        $request->validate([
            'member_id' => 'required|exists:members,MemberID',
        ]);
    
        $member = Member::findOrFail($request->input('member_id'));
    
        $rpEntity = new PublicKeyCredentialRpEntity(
            config('webauthn.relying_party.name'),
            config('webauthn.relying_party.id')
        );
    
        $userEntity = $member->getWebAuthnUserEntity();
    
        // Exclude already-registered credentials
        $excludeCredentials = [];
        foreach ($member->getWebAuthnCredentials() as $cred) {
            // Debug the properties of the credential
            Log::info("Credential properties from getWebAuthnCredentials", [
                'property_names' => array_keys(get_object_vars($cred))
            ]);
            
            $excludeCredentials[] = new PublicKeyCredentialDescriptor(
                'public-key',
                $cred->publicKeyCredentialId
            );
            
            // Debug the PublicKeyCredentialDescriptor properties
            $descriptor = end($excludeCredentials);
            Log::info("Descriptor properties", [
                'property_names' => array_keys(get_object_vars($descriptor))
            ]);
        }
    
        // Allowed algorithm parameters (from config)
        $pubKeyCredParams = [];
        foreach (config('webauthn.public_key_credential_parameters') as $param) {
            $pubKeyCredParams[] = new PublicKeyCredentialParameters(
                $param['type'],
                (int)$param['alg']
            );
        }
    
        // Create initial options
        $publicKeyCredentialCreationOptions = new PublicKeyCredentialCreationOptions(
            $rpEntity,
            $userEntity,
            random_bytes(config('webauthn.challenge_length')),
            $pubKeyCredParams
        );
    
        // Timeout & attestation from config
        $publicKeyCredentialCreationOptions->timeout = config('webauthn.credential_options.timeout');
        $publicKeyCredentialCreationOptions->attestation = config('webauthn.credential_options.attestation');
    
        // Exclude existing credentials
        if (!empty($excludeCredentials)) {
            $publicKeyCredentialCreationOptions->excludeCredentials = $excludeCredentials;
        }
    
        // IMPORTANT: AuthenticatorSelection => prefer resident keys
        // If you specifically want Windows Hello or other platform biometrics,
        // set 'authenticatorAttachment' => 'platform'
        // userVerification => 'required' or 'preferred'
        // requireResidentKey => false (unless you want to *force* passkeys)
        // Note: In WebAuthn 5.1, residentKey is the THIRD parameter (not fourth)
        // and can only be null or 'required' (not 'preferred')
        $authenticatorSelection = new AuthenticatorSelectionCriteria(
            'platform', // authenticatorAttachment
            'required', // userVerification
            null        // residentKey - must be null or 'required', NOT 'preferred'
        );
    
        $publicKeyCredentialCreationOptions->authenticatorSelection = $authenticatorSelection;
    
        // Convert to array for session + JSON
        $optionsArray = [
            'rp' => [
                'name' => $rpEntity->name,
                'id'   => $rpEntity->id,
            ],
            'user' => [
                'id'          => base64_encode($userEntity->id),
                'name'        => $userEntity->name,
                'displayName' => $userEntity->displayName,
            ],
            'challenge' => base64_encode($publicKeyCredentialCreationOptions->challenge),
            'pubKeyCredParams' => array_map(fn($p) => [
                'type' => $p->type,
                'alg'  => $p->alg,
            ], $publicKeyCredentialCreationOptions->pubKeyCredParams),
            'timeout'     => $publicKeyCredentialCreationOptions->timeout,
            'attestation' => $publicKeyCredentialCreationOptions->attestation,
            'authenticatorSelection' => [
                'authenticatorAttachment' => $authenticatorSelection->authenticatorAttachment,
                'userVerification'        => $authenticatorSelection->userVerification,
                'residentKey'             => $authenticatorSelection->residentKey,
            ],
        ];
    
        // Add excludeCredentials if any
        if (!empty($excludeCredentials)) {
            $optionsArray['excludeCredentials'] = array_map(function($cred) {
                // The PublicKeyCredentialDescriptor has an 'id' property in WebAuthn 5.1
                return [
                    'type' => $cred->type,
                    'id'   => base64_encode($cred->id),
                ];
            }, $excludeCredentials);
        }
    
        // Save in session
        $request->session()->put('webauthn.publicKeyCredentialCreationOptions', $optionsArray);
    
        return response()->json($optionsArray);
    }
    

    /**
     * Verify and save a fingerprint registration.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyAndSaveRegistration(Request $request): JsonResponse
    {
        $request->validate([
            'member_id' => 'required|exists:members,MemberID',
            'credential' => 'required|array',
        ]);

        // Get the member
        $memberId = $request->input('member_id');
        $member = Member::findOrFail($memberId);

        try {
            // Get the options from the session
            $optionsArray = $request->session()->get('webauthn.publicKeyCredentialCreationOptions');
            if ($optionsArray === null) {
                return response()->json(['error' => 'Registration session expired'], 400);
            }
            
            // Create options from array in WebAuthn 5.1 format
            // In WebAuthn 5.1, we need to manually create the objects
            Log::info("Creating PublicKeyCredentialCreationOptions from array data", $optionsArray);
            
            // Create RP Entity
            $rpEntity = new PublicKeyCredentialRpEntity(
                $optionsArray['rp']['name'],
                $optionsArray['rp']['id']
            );
            
            // Create User Entity
            $userEntity = new \Webauthn\PublicKeyCredentialUserEntity(
                $optionsArray['user']['name'],
                base64_decode($optionsArray['user']['id']),
                $optionsArray['user']['displayName']
            );
            
            // Decode challenge from base64
            $challenge = base64_decode($optionsArray['challenge']);
            
            // Create pubKeyCredParams array
            $pubKeyCredParams = [];
            foreach ($optionsArray['pubKeyCredParams'] as $param) {
                $pubKeyCredParams[] = new PublicKeyCredentialParameters(
                    $param['type'],
                    (int)$param['alg']
                );
            }
            
            // Create PublicKeyCredentialCreationOptions object
            $publicKeyCredentialCreationOptions = new PublicKeyCredentialCreationOptions(
                $rpEntity,
                $userEntity,
                $challenge,
                $pubKeyCredParams
            );
            
            // Set additional properties if they exist
            if (isset($optionsArray['timeout'])) {
                $publicKeyCredentialCreationOptions->timeout = $optionsArray['timeout'];
            }
            
            if (isset($optionsArray['attestation'])) {
                $publicKeyCredentialCreationOptions->attestation = $optionsArray['attestation'];
            }
            
            // Create AuthenticatorSelectionCriteria if it exists
            if (isset($optionsArray['authenticatorSelection'])) {
                $authenticatorSelection = new AuthenticatorSelectionCriteria(
                    $optionsArray['authenticatorSelection']['authenticatorAttachment'] ?? null,
                    $optionsArray['authenticatorSelection']['userVerification'] ?? 'required',
                    null // residentKey - must be null or 'required', NOT 'preferred'
                );
                $publicKeyCredentialCreationOptions->authenticatorSelection = $authenticatorSelection;
            }
            
            // Set exclude credentials if they exist
            if (isset($optionsArray['excludeCredentials'])) {
                $excludeCredentials = [];
                foreach ($optionsArray['excludeCredentials'] as $ec) {
                    $excludeCredentials[] = new PublicKeyCredentialDescriptor(
                        $ec['type'],
                        base64_decode($ec['id'])
                    );
                }
                $publicKeyCredentialCreationOptions->excludeCredentials = $excludeCredentials;
            }

            // Get WebAuthn services from Laravel container
            // These services should be registered in the service provider with correct namespaces
            try {
                $loader = app('webauthn.credential.loader');
                $validator = app('webauthn.attestation.validator');
                
                // Log what classes we're actually using
                Log::info("Using WebAuthn loader class: " . get_class($loader));
                Log::info("Using WebAuthn validator class: " . get_class($validator));
                
                // Load the credential from the request
                $credentialData = json_encode($request->input('credential'));
                Log::info("Credential data: " . $credentialData);
                
                // In WebAuthn 5.1, we need to load the PublicKeyCredential and then get the response
                $publicKeyCredential = $loader->load($credentialData);
                
                Log::info("Loaded credential class: " . get_class($publicKeyCredential));
                
                // Check that we have a PublicKeyCredential
                if (!$publicKeyCredential instanceof PublicKeyCredential) {
                    throw new Exception('Invalid credential type: ' . get_class($publicKeyCredential));
                }
                
                // Get the attestation response from the credential
                $authenticatorAttestationResponse = null;
                
                // Since there's no direct getResponse method, we need to access the response based on its actual implementation
                // This is a reflection-based approach to get the response property
                $reflectionClass = new \ReflectionClass($publicKeyCredential);
                $responseProperty = null;
                
                // Find the response property
                foreach ($reflectionClass->getProperties() as $property) {
                    $property->setAccessible(true);
                    $propertyName = $property->getName();
                    $propertyValue = $property->getValue($publicKeyCredential);
                    
                    Log::info("Checking property {$propertyName} of type " . (is_object($propertyValue) ? get_class($propertyValue) : gettype($propertyValue)));
                    
                    // If the property is of type AuthenticatorAttestationResponse, use it
                    if (is_object($propertyValue) && strpos(get_class($propertyValue), 'AuthenticatorAttestationResponse') !== false) {
                        $authenticatorAttestationResponse = $propertyValue;
                        Log::info("Found AuthenticatorAttestationResponse in property {$propertyName}");
                        break;
                    }
                }
                
                if ($authenticatorAttestationResponse === null) {
                    // Try to use properties from the JSON data to construct the response
                    $credentialArray = $request->input('credential');
                    Log::info("Creating attestation response from raw credential data", $credentialArray);
                    
                    // Access the responseClass directly from the validator or other means
                    // This is application-specific and might require adjustments
                    throw new Exception("Could not extract AuthenticatorAttestationResponse from credential. Check WebAuthn documentation for proper extraction in version 5.1");
                }
                
                // Get the request host name - The third parameter required by check() in WebAuthn 5.1
                $host = $request->getHost();
                Log::info("Using host for attestation verification: {$host}");
                
                // Use the validator to check the attestation response - now with 3 parameters
                $credentialSource = $validator->check(
                    $authenticatorAttestationResponse,
                    $publicKeyCredentialCreationOptions,
                    $host // The missing third parameter
                );
                
                // Save the credential
                $member->saveWebAuthnCredential($credentialSource);
                
                // Registration success
                return response()->json([
                    'success' => true,
                    'message' => 'Fingerprint registered successfully',
                ]);
            } catch (Exception $e) {
                Log::error('WebAuthn services error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
                return response()->json(['error' => 'WebAuthn service error: ' . $e->getMessage()], 500);
            }
        } catch (Exception $e) {
            // Log the full exception for debugging
            Log::error('WebAuthn registration error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Generate authentication options.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateAuthenticationOptions(Request $request): JsonResponse
    {
        // Create a random challenge
        $challenge = random_bytes(config('webauthn.challenge_length'));
        
        // Create options array manually instead of using jsonSerialize()
        $options = [
            // Base64 encode the challenge - this is important for binary data in JSON
            'challenge' => base64_encode($challenge),
            'rpId' => config('webauthn.relying_party.id'),
            'timeout' => config('webauthn.credential_options.timeout'),
            'userVerification' => config('webauthn.credential_options.user_verification'),
            'allowCredentials' => []
        ];

        // Save the options in the session - we need to save both formats
        // Save the raw binary challenge for the PublicKeyCredentialRequestOptions constructor
        $request->session()->put('webauthn.publicKeyCredentialRequestOptions', $options);
        $request->session()->put('webauthn.challenge', $challenge);

        // Return the options
        return response()->json($options);
    }

    /**
     * Verify authentication and record visit.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyAuthentication(Request $request): JsonResponse
    {
        $request->validate([
            'branch_id' => 'required|exists:branches,BranchID',
            'credential' => 'required|array',
        ]);

        try {
            // Get the options from the session
            $optionsArray = $request->session()->get('webauthn.publicKeyCredentialRequestOptions');
            if ($optionsArray === null) {
                return response()->json(['error' => 'Authentication session expired'], 400);
            }
            
            // Get the raw binary challenge 
            $challenge = $request->session()->get('webauthn.challenge');
            if (!$challenge) {
                // Fallback to decoding from base64 if needed
                $challenge = base64_decode($optionsArray['challenge']);
            }
            
            // Create PublicKeyCredentialRequestOptions with the binary challenge
            // In WebAuthn 5.1, we need to manually create the object
            Log::info("Creating PublicKeyCredentialRequestOptions from array data", $optionsArray);
            
            // Create the PublicKeyCredentialRequestOptions object
            $publicKeyCredentialRequestOptions = new PublicKeyCredentialRequestOptions(
                $challenge, // Binary challenge
                $optionsArray['rpId'] ?? null
            );
            
            // Set additional properties if they exist
            if (isset($optionsArray['timeout'])) {
                $publicKeyCredentialRequestOptions->timeout = $optionsArray['timeout'];
            }
            
            if (isset($optionsArray['userVerification'])) {
                $publicKeyCredentialRequestOptions->userVerification = $optionsArray['userVerification'];
            }
            
            // Set allowCredentials if they exist
            if (isset($optionsArray['allowCredentials']) && !empty($optionsArray['allowCredentials'])) {
                $allowCredentials = [];
                foreach ($optionsArray['allowCredentials'] as $ac) {
                    $allowCredentials[] = new PublicKeyCredentialDescriptor(
                        $ac['type'],
                        base64_decode($ac['id'])
                    );
                }
                $publicKeyCredentialRequestOptions->allowCredentials = $allowCredentials;
            }
            
            // Get WebAuthn services from Laravel container
            try {
                $loader = app('webauthn.credential.loader');
                $validator = app('webauthn.assertion.validator');
                
                // Log what classes we're actually using
                Log::info("Using WebAuthn assertion loader class: " . get_class($loader));
                Log::info("Using WebAuthn assertion validator class: " . get_class($validator));
                
                // Load the credential
                $credentialData = json_encode($request->input('credential'));
                Log::info("Assertion credential data: " . $credentialData);
                
                // In WebAuthn 5.1, we need to load the PublicKeyCredential and then get the response
                $publicKeyCredential = $loader->load($credentialData);
                
                // Log the loaded credential class
                Log::info("Loaded assertion class: " . get_class($publicKeyCredential));
                
                // Check that we have a PublicKeyCredential
                if (!$publicKeyCredential instanceof PublicKeyCredential) {
                    throw new Exception('Invalid credential type: ' . get_class($publicKeyCredential));
                }
                
                // Get the assertion response from the credential
                $authenticatorAssertionResponse = null;
                
                // Similar to attestation, we need to use reflection to get the assertion response
                $reflectionClass = new \ReflectionClass($publicKeyCredential);
                $responseProperty = null;
                
                // Find the response property
                foreach ($reflectionClass->getProperties() as $property) {
                    $property->setAccessible(true);
                    $propertyName = $property->getName();
                    $propertyValue = $property->getValue($publicKeyCredential);
                    
                    Log::info("Checking assertion property {$propertyName} of type " . (is_object($propertyValue) ? get_class($propertyValue) : gettype($propertyValue)));
                    
                    // If the property is of type AuthenticatorAssertionResponse, use it
                    if (is_object($propertyValue) && strpos(get_class($propertyValue), 'AuthenticatorAssertionResponse') !== false) {
                        $authenticatorAssertionResponse = $propertyValue;
                        Log::info("Found AuthenticatorAssertionResponse in property {$propertyName}");
                        break;
                    }
                }
                
                if ($authenticatorAssertionResponse === null) {
                    // Try to use properties from the JSON data to construct the response
                    $credentialArray = $request->input('credential');
                    Log::info("Creating assertion response from raw credential data", $credentialArray);
                    
                    // This is application-specific and might require adjustments
                    throw new Exception("Could not extract AuthenticatorAssertionResponse from credential. Check WebAuthn documentation for proper extraction in version 5.1");
                }
                
                // Get the request host name - The fourth parameter required by check() in WebAuthn 5.1
                $host = $request->getHost();
                Log::info("Using host for assertion verification: {$host}");
                
                // First, we need to retrieve the credential ID from the response
                $credentialId = $authenticatorAssertionResponse->credentialId ?? null;

                if (!$credentialId) {
                    // Get it from the raw credential data if needed
                    $credentialArray = $request->input('credential');
                    if (isset($credentialArray['id'])) {
                        $credentialId = base64_decode($credentialArray['id']);
                    } else {
                        throw new Exception("Cannot find credential ID in the response");
                    }
                }

                // Find the credential source using the credential ID
                // Use the repository from app\Services\WebAuthnCredentialRepository directly
                $repository = app()->make('App\Services\WebAuthnCredentialRepository');
                $publicKeyCredentialSource = $repository->findOneByCredentialId($credentialId);

                if (!$publicKeyCredentialSource) {
                    return response()->json(['error' => 'Unknown credential. Please register first.'], 400);
                }

                Log::info("Found credential source for ID: " . base64_encode($credentialId));

                // Optional user handle (usually null for most authentication scenarios)
                $userHandle = null;
                if (isset($authenticatorAssertionResponse->userHandle) && $authenticatorAssertionResponse->userHandle !== null) {
                    $userHandle = $authenticatorAssertionResponse->userHandle;
                }

                // Validate the assertion with the correct parameter order for WebAuthn 5.1
                $validatedPublicKeyCredentialSource = $validator->check(
                    $publicKeyCredentialSource,
                    $authenticatorAssertionResponse,
                    $publicKeyCredentialRequestOptions,
                    $host,
                    $userHandle
                );

                // Get the member from the credential
                $memberId = $validatedPublicKeyCredentialSource->userHandle;
                $member = Member::find($memberId);
                
                if (!$member) {
                    return response()->json(['error' => 'Member not found'], 404);
                }
                
                // Get the branch ID
                $branchId = $request->input('branch_id');
                
                // Record the visit
                DB::transaction(function () use ($member, $branchId) {
                    // Create a new visit record
                    $visit = new MemberVisit([
                        'BranchID' => $branchId,
                        'MemberID' => $member->MemberID,
                        'VisitDate' => now()->toDateString(),
                        'VisitTime' => now()->toTimeString(),
                        'CheckInMethod' => 'Biometric',
                        'Remarks' => 'Checked in using fingerprint scanner'
                    ]);
                    
                    $visit->save();
                });
                
                // Return success
                return response()->json([
                    'success' => true,
                    'message' => 'Member authenticated successfully',
                    'member' => [
                        'id' => $member->MemberID,
                        'name' => $member->FullName,
                    ]
                ]);
            } catch (Exception $e) {
                Log::error('WebAuthn services error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
                return response()->json(['error' => 'WebAuthn service error: ' . $e->getMessage()], 500);
            }
        } catch (Exception $e) {
            // Log the full exception for debugging
            Log::error('WebAuthn authentication error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
} 