<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Auth adapter identity — which provider this user
            // authenticates through, and their subject id there.
            $table->string('auth_provider')->default('local')->after('id');
            $table->string('provider_subject_id')->nullable()->after('auth_provider');

            // Only local-auth users have a password; Keycloak-backed
            // users never populate this.
            $table->string('password')->nullable()->change();

            // Platform-scoped role. Deliberately just two values for
            // now (user / superadmin).
            $table->string('platform_role')->default('user')->after('provider_subject_id');
        });

        // Backfill provider_subject_id for any pre-existing rows so
        // lookups stay uniform across providers (see LocalAuthProvider
        // notes — every user has a subject id, not just Keycloak ones).
        DB::table('users')->whereNull('provider_subject_id')->cursor()->each(function ($user) {
            DB::table('users')
                ->where('id', $user->id)
                ->update(['provider_subject_id' => (string)Str::uuid()]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unique(['auth_provider', 'provider_subject_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['auth_provider', 'provider_subject_id']);
            $table->dropColumn(['auth_provider', 'provider_subject_id', 'platform_role']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
