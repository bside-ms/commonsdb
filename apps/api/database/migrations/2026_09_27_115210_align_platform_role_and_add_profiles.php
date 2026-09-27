<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 'user' reads like a row in `users`, not a role. The rest of
        // the system (prototype, roadmap, policies) speaks
        // member | admin | superadmin.
        DB::table('users')->where('platform_role', 'user')->update(['platform_role' => 'member']);

        Schema::table('users', function (Blueprint $table) {
            $table->string('platform_role')->default('member')->change();
        });

        // users = identity. profiles = the human-facing person.
        // Split deliberately: a Keycloak-backed user has no password
        // here, but still has a pronoun and an accessibility note.
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained()->cascadeOnDelete();

            $table->string('display_name');
            $table->string('pronoun')->nullable();
            $table->string('phone')->nullable();

            // Free text, shown to admins organising a shift. Not a
            // medical record — see the note in the FormRequest.
            $table->text('accessibility_note')->nullable();

            // Super-category ids the person wants to hear about.
            // Stays JSON until categories exist in slice 2.
            $table->json('interests');

            $table->string('visibility')->default('members');       // members | admins
            $table->string('photo_visibility')->default('members'); // members | admins | nobody

            $table->boolean('notify_by_email')->default(true);
            $table->boolean('notify_new_tasks')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');

        Schema::table('users', function (Blueprint $table) {
            $table->string('platform_role')->default('user')->change();
        });

        DB::table('users')->where('platform_role', 'member')->update(['platform_role' => 'user']);
    }
};
