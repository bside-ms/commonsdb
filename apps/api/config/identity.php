<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Identity Provider Adapter
    |--------------------------------------------------------------------------
    |
    | Selects which AuthProviderContract implementation handles login for
    | this deployment — 'keycloak' for spaces with an existing IdP (OIDC),
    | or 'local' for the username/password fallback (see LocalAuthProvider).
    |
    */

    'provider' => env('AUTH_PROVIDER', 'local'),
];
