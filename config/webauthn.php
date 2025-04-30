<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Relying Party
    |--------------------------------------------------------------------------
    |
    | The relying party is your application that is using WebAuthn.
    | The name is shown during the registration process and can be any string.
    | The ID must be a valid domain name, without port, path or query components.
    |
    */
    'relying_party' => [
        'name' => env('APP_NAME', 'contnentalClub'),
        'id'   => env('APP_URL_DOMAIN', 'contnentalclub.com'),
    ],
    
    /*
    |--------------------------------------------------------------------------
    | Challenge Length
    |--------------------------------------------------------------------------
    |
    | The length of the challenge used during the WebAuthn operation.
    | This is a security parameter and should be at least 16 bytes.
    |
    */
    'challenge_length' => 32,
    
    /*
    |--------------------------------------------------------------------------
    | Credential Options
    |--------------------------------------------------------------------------
    |
    | Options related to credential creation and authentication.
    |
    */
    'credential_options' => [
        'timeout' => 60000, // 1 minute in milliseconds
        'user_verification' => 'preferred', // Can be 'required', 'preferred', or 'discouraged'
        'attestation' => 'none', // Can be 'none', 'indirect', 'direct', or 'enterprise'
        // Adding comment about supported resident key values in WebAuthn 5.1
        // 'resident_key' => null, // In WebAuthn 5.1, only null or 'required' are supported
    ],

    /*
    |--------------------------------------------------------------------------
    | Allowed Algorithms
    |--------------------------------------------------------------------------
    |
    | The algorithms allowed for credential creation.
    | This setting should be kept to secure algorithms only.
    |
    */
    'public_key_credential_parameters' => [
        ['type' => 'public-key', 'alg' => -7], // ES256
        ['type' => 'public-key', 'alg' => -257], // RS256
    ],
]; 