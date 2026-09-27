<?php

namespace App\Auth;

final class AuthenticatedIdentity
{
    public function __construct(
        public readonly string  $providerSubjectId,
        public readonly string  $email,
        public readonly ?string $displayName = null,
    )
    {
    }
}
