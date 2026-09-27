<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    private function member(): User
    {
        $user = User::create([
            'name' => 'Jo Beispiel',
            'email' => 'jo@b-side.test',
            'password' => 'correct-horse-battery',
            'auth_provider' => 'local',
            'provider_subject_id' => (string)Str::uuid(),
        ]);

        $user->profile()->create(['display_name' => 'Jo Beispiel', 'interests' => []]);

        return $user;
    }

    public function test_it_signs_in_with_correct_credentials(): void
    {
        $this->member();

        $this->postJson('/api/sign-in', [
            'email' => 'jo@b-side.test',
            'password' => 'correct-horse-battery',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'jo@b-side.test')
            ->assertJsonStructure(['token']);
    }

    public function test_it_gives_the_same_error_for_unknown_email_and_wrong_password(): void
    {
        $this->member();

        $unknown = $this->postJson('/api/sign-in', [
            'email' => 'nobody@b-side.test',
            'password' => 'correct-horse-battery',
        ])->assertStatus(422);

        $wrong = $this->postJson('/api/sign-in', [
            'email' => 'jo@b-side.test',
            'password' => 'wrong',
        ])->assertStatus(422);

        // Differing messages would tell an attacker which addresses
        // are registered.
        $this->assertSame($unknown->json('errors'), $wrong->json('errors'));
    }

    public function test_sign_out_revokes_only_the_current_token(): void
    {
        $user = $this->member();

        $phone = $user->createToken('phone')->plainTextToken;
        $laptop = $user->createToken('laptop')->plainTextToken;

        $this->withToken($laptop)->deleteJson('/api/sign-out')->assertNoContent();

        // The app isn't rebooted between requests in one test method, so
        // the guard still holds the user it resolved during the DELETE.
        $this->app['auth']->forgetGuards();

        $this->withToken($laptop)->getJson('/api/me')->assertUnauthorized();

        $this->app['auth']->forgetGuards();

        $this->withToken($phone)->getJson('/api/me')->assertOk();
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }
}
