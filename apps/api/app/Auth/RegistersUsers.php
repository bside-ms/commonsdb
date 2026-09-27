<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creating a person is two writes that must not half-happen: the
 * identity row and the profile row. Kept here rather than in the
 * controller so the seeder and any future admin-invite flow create
 * people the same way.
 *
 * Only handles auth_provider = 'local'. Keycloak users arrive via
 * first-login provisioning, which is a different path (slice 1 does
 * not need it — LocalAuthProvider is the whitelabel fallback).
 */
final class RegistersUsers
{
    /**
     * @param array{name: string, email: string, password: string, pronoun?: ?string, phone?: ?string, accessibility_note?: ?string, interests?: array<int, string>} $data
     */
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'auth_provider' => 'local',
                // Every user has a subject id, not just Keycloak ones —
                // so lookups stay uniform across providers.
                'provider_subject_id' => (string)Str::uuid(),
            ]);

            $user->profile()->create([
                'display_name' => $data['name'],
                'pronoun' => $data['pronoun'] ?? null,
                'phone' => $data['phone'] ?? null,
                'accessibility_note' => $data['accessibility_note'] ?? null,
                'interests' => $data['interests'] ?? [],
            ]);

            return $user->load('profile');
        });
    }
}
