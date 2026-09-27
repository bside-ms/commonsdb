<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Self-serve registration, matching the prototype. If the
        // b-side later wants admin approval, this is the one place
        // that changes.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],

            'pronoun' => ['nullable', 'string', 'max:40'],
            'phone' => ['nullable', 'string', 'max:40'],

            // Free text by design. People describe access needs in
            // their own words; a dropdown of conditions would be both
            // wrong and intrusive.
            'accessibility_note' => ['nullable', 'string', 'max:2000'],

            'interests' => ['array'],
            'interests.*' => ['string', 'max:64'],

            'accepts_rules' => ['accepted'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'accepts_rules.accepted' => 'Bitte bestätige die Hausregeln, um mitzumachen.',
        ];
    }
}
