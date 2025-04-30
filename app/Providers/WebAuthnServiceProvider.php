<?php

namespace App\Providers;

use App\Services\WebAuthnCredentialRepository;
use Illuminate\Support\ServiceProvider;
use Psr\Log\LoggerInterface;
use Webauthn\AttestationStatement\AttestationStatementSupportManager;
use Webauthn\AttestationStatement\NoneAttestationStatementSupport;
use Webauthn\Denormalizer\WebauthnSerializerFactory;
use Webauthn\Bundle\Service\PublicKeyCredentialLoader;
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\AuthenticatorAssertionResponseValidator;
use Webauthn\Bundle\Repository\PublicKeyCredentialSourceRepositoryInterface;
use Webauthn\CeremonyStep\CeremonyStepManager;
use Webauthn\CeremonyStep\CeremonyStepManagerFactory;

class WebAuthnServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register repository with explicit class paths
        $this->app->singleton(\App\Services\WebAuthnCredentialRepository::class);
        
        // Bind the interface to our concrete implementation with explicit class paths
        $this->app->bind(
            \Webauthn\Bundle\Repository\PublicKeyCredentialSourceRepositoryInterface::class, 
            \App\Services\WebAuthnCredentialRepository::class
        );
        
        // Also bind using alias for simpler use
        $this->app->alias(
            \App\Services\WebAuthnCredentialRepository::class, 
            'webauthn.credential.repository'
        );
        
        // Register the attestation statement support manager
        $this->app->singleton(AttestationStatementSupportManager::class, function () {
            $manager = new AttestationStatementSupportManager();
            $manager->add(new NoneAttestationStatementSupport());
            return $manager;
        });
        
        // Register the ceremony step manager factory
        $this->app->singleton(CeremonyStepManagerFactory::class, function () {
            return new CeremonyStepManagerFactory();
        });
        
        // Register ceremony step managers
        $this->app->singleton('webauthn.ceremony.creation', function ($app) {
            // Use the factory to create a properly configured Creation CeremonyStepManager
            $factory = $app->make(CeremonyStepManagerFactory::class);
            return $factory->creationCeremony();
        });
        
        $this->app->singleton('webauthn.ceremony.request', function ($app) {
            // Use the factory to create a properly configured Request CeremonyStepManager
            $factory = $app->make(CeremonyStepManagerFactory::class);
            return $factory->requestCeremony();
        });
        
        // Register the WebAuthn services
        // Register the public key credential loader
        $this->app->singleton('webauthn.credential.loader', function ($app) {
            try {
                // First, get the AttestationStatementSupportManager
                $manager = $app->make(AttestationStatementSupportManager::class);
                
                // Create the WebauthnSerializerFactory with the required manager
                $factory = new WebauthnSerializerFactory($manager);
                
                // Create a custom PublicKeyCredentialLoader with the serializer
                return new \App\Services\PublicKeyCredentialLoader(
                    $factory->create()
                );
            } catch (\Exception $e) {
                $app->make(LoggerInterface::class)->error('Failed to create PublicKeyCredentialLoader: ' . $e->getMessage());
                throw $e;
            }
        });
        
        // Register the authenticator attestation response validator
        $this->app->singleton('webauthn.attestation.validator', function ($app) {
            try {
                return new AuthenticatorAttestationResponseValidator(
                    $app->make('webauthn.ceremony.creation'),
                    $app->make(PublicKeyCredentialSourceRepositoryInterface::class)
                );
            } catch (\Exception $e) {
                $app->make(LoggerInterface::class)->error('Failed to create AuthenticatorAttestationResponseValidator: ' . $e->getMessage());
                throw $e;
            }
        });
        
        // Register the authenticator assertion response validator
        $this->app->singleton('webauthn.assertion.validator', function ($app) {
            try {
                return new AuthenticatorAssertionResponseValidator(
                    $app->make('webauthn.ceremony.request'),
                    $app->make(PublicKeyCredentialSourceRepositoryInterface::class)
                );
            } catch (\Exception $e) {
                $app->make(LoggerInterface::class)->error('Failed to create AuthenticatorAssertionResponseValidator: ' . $e->getMessage());
                throw $e;
            }
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
} 