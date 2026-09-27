<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property list<string> $interests
 */
#[Fillable([
    'display_name',
    'pronoun',
    'phone',
    'accessibility_note',
    'interests',
    'visibility',
    'photo_visibility',
    'notify_by_email',
    'notify_new_tasks',
])]
class Profile extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'interests' => 'array',
            'notify_by_email' => 'boolean',
            'notify_new_tasks' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
