<?php

namespace App\Services;

use Symfony\Component\Serializer\SerializerInterface;
use Webauthn\PublicKeyCredential;

class PublicKeyCredentialLoader
{
    /**
     * The serializer instance.
     */
    private SerializerInterface $serializer;

    /**
     * Constructor.
     */
    public function __construct(SerializerInterface $serializer)
    {
        $this->serializer = $serializer;
    }

    /**
     * Load the public key credential from the client data.
     */
    public function loadArray(array $data): PublicKeyCredential
    {
        return $this->serializer->denormalize($data, PublicKeyCredential::class);
    }

    /**
     * Load the public key credential from a JSON string.
     */
    public function load(string $data): PublicKeyCredential
    {
        $rawData = json_decode($data, true);
        if (!is_array($rawData)) {
            throw new \InvalidArgumentException('Invalid data provided');
        }

        return $this->loadArray($rawData);
    }
} 