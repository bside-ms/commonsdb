<?php

namespace App\Auth\Providers;

use App\Auth\AuthenticatedIdentity;
use App\Auth\Contracts\AuthProviderContract;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * Fallback adapter for spaces without an IdP: username/password
 * stored locally, hashed via Laravel's default hasher.
 *
 * Only ever touches users where auth_provider = 'local'. Never
 * looks at provider_subject_id for anything Keycloak-issued.
 */
final class LocalAuthProvider implements AuthProviderContract
{
    public function attempt(array $credentials): ?AuthenticatedIdentity
    {
        $user = User::query()
            ->where('auth_provider', 'local')
            ->where('email', $credentials['email'] ?? null)
            ->first();

        if (!$user || !$user->password) {
            return null;
        }

        if (!Hash::check($credentials['password'] ?? '', $user->password)) {
            return null;
        }

        return $this->toIdentity($user);
    }

    public function retrieveById(string $providerSubjectId): ?AuthenticatedIdentity
    {
        $user = User::query()
            ->where('auth_provider', 'local')
            ->where('provider_subject_id', $providerSubjectId)
            ->first();

        return $user ? $this->toIdentity($user) : null;
    }

    public function logout(AuthenticatedIdentity $identity): void
    {
        // Stateless for local auth (session/token invalidation is
        // handled by the auth guard, not the provider itself).
        // Present to satisfy the contract; Keycloak's implementation
        // will actually need to hit the IdP's end-session endpoint.
    }

    private function toIdentity(User $user): AuthenticatedIdentity
    {
        return new AuthenticatedIdentity(
            providerSubjectId: $user->provider_subject_id,
            email: $user->email,
            displayName: $user->name,
        );
    }
}
