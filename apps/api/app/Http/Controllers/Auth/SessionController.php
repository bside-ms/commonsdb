<?php

namespace App\Http\Controllers\Auth;

use App\Auth\Contracts\AuthProviderContract;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class SessionController extends Controller
{
    /**
     * Sign in.
     *
     * Credentials go through AuthProviderContract, so the same route
     * works whether the space runs Keycloak or local passwords. The
     * provider returns an identity; this controller turns it into a
     * token.
     */
    public function store(LoginRequest $request, AuthProviderContract $provider): JsonResponse
    {
        $identity = $provider->attempt($request->validated());

        if ($identity === null) {
            // One message for both wrong-email and wrong-password:
            // distinguishing them tells an attacker which addresses
            // are registered.
            throw ValidationException::withMessages([
                'email' => 'E-Mail oder Passwort stimmt nicht.',
            ]);
        }

        $user = User::query()
            ->where('provider_subject_id', $identity->providerSubjectId)
            ->with('profile')
            ->firstOrFail();

        return response()->json([
            'user' => new UserResource($user),
            'token' => $user->createToken($request->input('deviceName', 'web'))->plainTextToken,
        ]);
    }

    /**
     * Sign out, revoking only the token used for this request.
     * Other devices stay signed in.
     */
    public function destroy(Request $request, AuthProviderContract $provider): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }
}
