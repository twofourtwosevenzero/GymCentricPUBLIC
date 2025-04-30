<?php

namespace App\Webauthn;

use Webauthn\AuthenticatorAttestationResponse;
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\Exception\AuthenticatorResponseVerificationException;
use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\PublicKeyCredentialSource;
use Psr\Log\LoggerInterface;
use Illuminate\Support\Facades\Log;
use Webauthn\Bundle\Repository\PublicKeyCredentialSourceRepositoryInterface;

class CustomAuthenticatorAttestationResponseValidator extends AuthenticatorAttestationResponseValidator
{
    public function __construct(
        PublicKeyCredentialSourceRepositoryInterface $credentialSourceRepository,
        ?\Cose\Algorithm\Manager $algorithmManager = null,
        ?LoggerInterface $logger = null
    ) {
        parent::__construct($credentialSourceRepository, $algorithmManager, $logger);
        \Log::info('CustomAuthenticatorAttestationResponseValidator constructor called!');
    }

    public function check(
        AuthenticatorAttestationResponse $authenticatorAttestationResponse,
        PublicKeyCredentialCreationOptions $publicKeyCredentialCreationOptions,
        string $host
    ): PublicKeyCredentialSource {
        try {
            // Call the parent check() method normally
            return parent::check($authenticatorAttestationResponse, $publicKeyCredentialCreationOptions, $host);
        } catch (AuthenticatorResponseVerificationException $e) {
            // If the error message includes "Invalid resident key", we bypass it or handle it
            if (stripos($e->getMessage(), 'invalid resident key') !== false) {
                Log::warning('Bypassing "Invalid resident key" check: ' . $e->getMessage());
                // TODO: Decide how to handle the fallback. Possibly:
                // 1) Return a PublicKeyCredentialSource manually, or
                // 2) Re-call parent::check() after adjusting data, or
                // 3) Just do nothing if you're sure you don't need a resident key
            }

            throw $e; // If it's some other error, re-throw
        }
    }
}
