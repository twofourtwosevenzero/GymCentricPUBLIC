<?php

namespace App\Services;

use App\Models\Member;
use Webauthn\PublicKeyCredentialSource;
use Webauthn\PublicKeyCredentialUserEntity;
use Webauthn\Bundle\Repository\PublicKeyCredentialSourceRepositoryInterface;

class WebAuthnCredentialRepository implements PublicKeyCredentialSourceRepositoryInterface
{
    /**
     * Find a credential source by credential ID efficiently.
     *
     * @param string $publicKeyCredentialId
     * @return PublicKeyCredentialSource|null
     */
    public function findOneByCredentialId(string $publicKeyCredentialId): ?PublicKeyCredentialSource
    {
        // Find members with Biometrics data
        $members = Member::whereNotNull('Biometrics')->get();
        
        foreach ($members as $member) {
            $credential = $member->findCredentialById($publicKeyCredentialId);
            if ($credential) {
                return $credential;
            }
        }
        
        return null;
    }
    
    
    /**
     * Find all credential sources for a given user entity.
     *
     * @param PublicKeyCredentialUserEntity $publicKeyCredentialUserEntity
     * @return array<PublicKeyCredentialSource>
     */
    public function findAllForUserEntity(PublicKeyCredentialUserEntity $publicKeyCredentialUserEntity): array
    {
        $userHandle = $publicKeyCredentialUserEntity->id;
        $member = Member::find($userHandle);
        
        return $member ? $member->getWebAuthnCredentials() : [];
    }
    
    /**
     * Save a credential source securely.
     *
     * @param PublicKeyCredentialSource $publicKeyCredentialSource
     */
    public function saveCredentialSource(PublicKeyCredentialSource $publicKeyCredentialSource): void
    {
        $memberId = $publicKeyCredentialSource->userHandle;
        $member = Member::find($memberId);
        
        if (!$member) {
            throw new \InvalidArgumentException('Member not found');
        }
        
        $member->saveWebAuthnCredential($publicKeyCredentialSource);
    }
}
