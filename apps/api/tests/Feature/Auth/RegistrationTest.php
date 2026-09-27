<?php

namespace Tests\Feature\Auth;

use App\Enums\PlatformRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Jo Beispiel',
            'email' => 'jo@b-side.test',
            'password' => 'correct-horse-battery',
            'passwordConfirmation' => 'correct-horse-battery',
            'acceptsRules' => true,
        ], $overrides);
    }

    public function test_it_creates_a_user_with_a_profile_and_returns_a_token(): void
    {
        $response = $this->postJson('/api/register', $this->payload([
            'pronoun' => 'they/them',
            'interests' => ['sc1', 'sc2'],
        ]));

        $response->assertCreated()
            ->assertJsonPath('user.email', 'jo@b-side.test')
            ->assertJsonPath('user.platformRole', 'member')
            ->assertJsonPath('user.profile.pronoun', 'they/them')
            ->assertJsonPath('user.profile.interests', ['sc1', 'sc2'])
            ->assertJsonStructure(['token']);

        $user = User::firstWhere('email', 'jo@b-side.test');

        $this->assertSame(PlatformRole::Member, $user->platform_role);
        $this->assertSame('local', $user->auth_provider);
        $this->assertNotNull($user->provider_subject_id, 'every user needs a subject id, not just Keycloak ones');
        $this->assertNotNull($user->profile);
    }

    public function test_it_rejects_a_mismatched_password_confirmation(): void
    {
        $this->postJson('/api/register', $this->payload([
            'passwordConfirmation' => 'something-else',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_it_never_returns_the_password_hash(): void
    {
        $response = $this->postJson('/api/register', $this->payload());

        $this->assertArrayNotHasKey('password', $response->json('user'));
    }

    public function test_it_requires_the_house_rules_to_be_accepted(): void
    {
        $this->postJson('/api/register', $this->payload(['acceptsRules' => false]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('acceptsRules');
    }

    public function test_it_rejects_a_duplicate_email(): void
    {
        $this->postJson('/api/register', $this->payload())->assertCreated();

        $this->postJson('/api/register', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_it_leaves_no_user_behind_when_the_profile_cannot_be_written(): void
    {
        // The two writes are one transaction. If this ever regresses,
        // a failed registration leaves an account nobody can complete.
        $this->postJson('/api/register', $this->payload(['name' => str_repeat('a', 500)]))
            ->assertStatus(422);

        $this->assertDatabaseCount('users', 0);
    }
}
