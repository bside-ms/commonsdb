<?php

namespace App\Providers;

use App\Auth\Contracts\AuthProviderContract;
use App\Auth\Providers\KeycloakAuthProvider;
use App\Auth\Providers\LocalAuthProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AuthProviderContract::class, match (config('identity.provider')) {
            'keycloak' => KeycloakAuthProvider::class,
            'local' => LocalAuthProvider::class,
            default => throw new \InvalidArgumentException(
                'Unknown identity.provider: ' . config('identity.provider')
            ),
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
