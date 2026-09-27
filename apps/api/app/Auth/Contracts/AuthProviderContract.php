<?php

namespace App\Auth\Contracts;

use App\Auth\AuthenticatedIdentity;

interface AuthProviderContract
{
    public function attempt(array $credentials): ?AuthenticatedIdentity;

    public function retrieveById(string $providerSubjectId): ?AuthenticatedIdentity;

    public function logout(AuthenticatedIdentity $identity): void;
}
