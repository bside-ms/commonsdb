<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        // A person edits their own profile. There is no route here
        // for editing someone else's — that is a superadmin action
        // with its own Policy in slice 4.
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'displayName' => ['required', 'string', 'max:120'],
            'pronoun' => ['nullable', 'string', 'max:40'],
            'phone' => ['nullable', 'string', 'max:40'],
            'accessibilityNote' => ['nullable', 'string', 'max:2000'],

            'interests' => ['array'],
            'interests.*' => ['string', 'max:64'],

            'visibility' => ['required', Rule::in(['members', 'admins'])],
            'photoVisibility' => ['required', Rule::in(['members', 'admins', 'nobody'])],

            'notifyByEmail' => ['boolean'],
            'notifyNewTasks' => ['boolean'],
        ];
    }

    /**
     * The wire is camelCase; the columns are snake_case. Mapped here so
     * the controller stays a controller and there's one obvious place to
     * look when a field doesn't save.
     *
     * @return array<string, mixed>
     */
    public function toProfileAttributes(): array
    {
        $data = $this->validated();

        return [
            'display_name' => $data['displayName'],
            'pronoun' => $data['pronoun'] ?? null,
            'phone' => $data['phone'] ?? null,
            'accessibility_note' => $data['accessibilityNote'] ?? null,
            'interests' => $data['interests'] ?? [],
            'visibility' => $data['visibility'],
            'photo_visibility' => $data['photoVisibility'],
            'notify_by_email' => $data['notifyByEmail'] ?? true,
            'notify_new_tasks' => $data['notifyNewTasks'] ?? false,
        ];
    }
}
