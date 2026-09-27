<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The shape the frontend receives. Scramble reads this to build the
 * OpenAPI schema, so this class is effectively the API contract —
 * adding a field here is what makes it appear in the generated
 * TypeScript.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'platformRole' => $this->platform_role->value,
            'authProvider' => $this->auth_provider,
            'profile' => new ProfileResource($this->whenLoaded('profile')),
        ];
    }
}
