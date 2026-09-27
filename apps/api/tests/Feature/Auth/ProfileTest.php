<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private function member(string $email = 'jo@b-side.test'): User
    {
        $user = User::create([
            'name' => 'Jo Beispiel',
            'email' => $email,
            'password' => 'correct-horse-battery',
            'auth_provider' => 'local',
            'provider_subject_id' => (string)Str::uuid(),
        ]);

        $user->profile()->create(['display_name' => 'Jo Beispiel', 'interests' => []]);

        return $user;
    }

    public function test_a_member_can_update_their_own_profile(): void
    {
        $user = $this->member();

        $this->actingAs($user)
            ->patchJson('/api/me', [
                'displayName' => 'Jo',
                'pronoun' => 'they/them',
                'accessibilityNote' => 'Kann nicht schwer heben.',
                'interests' => ['sc1'],
                'visibility' => 'admins',
                'photoVisibility' => 'nobody',
                'notifyByEmail' => false,
                'notifyNewTasks' => true,
            ])
            ->assertOk()
            ->assertJsonPath('profile.displayName', 'Jo')
            ->assertJsonPath('profile.photoVisibility', 'nobody')
            ->assertJsonPath('profile.notifyByEmail', false);
    }

    public function test_it_rejects_an_unknown_visibility_value(): void
    {
        $this->actingAs($this->member())
            ->patchJson('/api/me', [
                'displayName' => 'Jo',
                'visibility' => 'everyone',
                'photoVisibility' => 'members',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('visibility');
    }

    public function test_a_member_cannot_promote_themselves(): void
    {
        $user = $this->member();

        $this->actingAs($user)->patchJson('/api/me', [
            'displayName' => 'Jo',
            'visibility' => 'members',
            'photoVisibility' => 'members',
            'platformRole' => 'superadmin',
        ])->assertOk();

        $this->assertSame('member', $user->fresh()->platform_role->value);
    }
}
