<?php

use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SessionController;
use Illuminate\Support\Facades\Route;

/*
 * Slice 1: identity and profile.
 *
 * Every route here is consumed by the SvelteKit BFF, never by a
 * browser directly — the token lives in an httpOnly cookie on the
 * Node server and is forwarded as a Bearer header.
 */

Route::post('register', RegisterController::class)
    ->middleware('throttle:6,1')
    ->name('register');

Route::post('sign-in', [SessionController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('sign-in');

Route::middleware('auth:sanctum')->group(function () {
    Route::delete('sign-out', [SessionController::class, 'destroy'])->name('sign-out');

    Route::get('me', [MeController::class, 'show'])->name('me.show');
    Route::patch('me', [MeController::class, 'update'])->name('me.update');
});
