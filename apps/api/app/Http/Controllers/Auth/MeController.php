<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

class MeController extends Controller
{
    /**
     * The signed-in user and their profile.
     */
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user()->load('profile'));
    }

    /**
     * Update the signed-in user's own profile.
     */
    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();

        $user->profile->update($request->toProfileAttributes());

        return new UserResource($user->load('profile'));
    }
}
