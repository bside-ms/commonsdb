<?php

namespace App\Enums;

/**
 * Platform-wide role. Deliberately coarse.
 *
 * Category-scoped admin responsibility ("admin of Küche and Tresen")
 * is a separate `capabilities` table in slice 4 — it is not a role.
 * Admin here means "has some administrative capability somewhere";
 * Policies decide where.
 */
enum PlatformRole: string
{
    case Member = 'member';
    case Admin = 'admin';
    case Superadmin = 'superadmin';

    public function isAtLeastAdmin(): bool
    {
        return $this === self::Admin || $this === self::Superadmin;
    }
}
