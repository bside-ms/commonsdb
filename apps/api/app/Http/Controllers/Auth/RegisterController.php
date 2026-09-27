<?php

namespace App\Http\Controllers\Auth;

use App\Auth\RegistersUsers;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    /**
     * Register a new member.
     *
     * Creates a local account and its profile, then issues an API
     * token so the caller is signed in immediately.
     */
    public function __invoke(RegisterRequest $request, RegistersUsers $registrar): JsonResponse
    {
        $user = $registrar->create($request->toUserData());
        $token = $user->createToken('registration')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }
}
