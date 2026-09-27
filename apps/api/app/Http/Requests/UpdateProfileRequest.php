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
            'display_name' => ['required', 'string', 'max:120'],
            'pronoun' => ['nullable', 'string', 'max:40'],
            'phone' => ['nullable', 'string', 'max:40'],
            'accessibility_note' => ['nullable', 'string', 'max:2000'],

            'interests' => ['array'],
            'interests.*' => ['string', 'max:64'],

            'visibility' => ['required', Rule::in(['members', 'admins'])],
            'photo_visibility' => ['required', Rule::in(['members', 'admins', 'nobody'])],

            'notify_by_email' => ['boolean'],
            'notify_new_tasks' => ['boolean'],
        ];
    }
}
