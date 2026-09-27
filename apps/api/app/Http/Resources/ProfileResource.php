<?php

namespace App\Http\Resources;

use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * camelCase on the wire, snake_case in the database. Chosen once,
 * here, so the generated TypeScript reads like TypeScript.
 *
 * @mixin Profile
 */
class ProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'displayName' => $this->display_name,
            'pronoun' => $this->pronoun,
            'phone' => $this->phone,
            'accessibilityNote' => $this->accessibility_note,
            'interests' => $this->interests,
            'visibility' => $this->visibility,
            'photoVisibility' => $this->photo_visibility,
            'notifyByEmail' => $this->notify_by_email,
            'notifyNewTasks' => $this->notify_new_tasks,
        ];
    }
}
