<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Self-serve registration, matching the prototype.
        // If some organization later wants admin approval, this is the one place that changes.
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
            'password' => ['required', 'confirmed:passwordConfirmation', Password::defaults()],

            'pronoun' => ['nullable', 'string', 'max:40'],
            'phone' => ['nullable', 'string', 'max:40'],

            // Free text by design. People describe access needs in
            // their own words; a dropdown of conditions would be both
            // wrong and intrusive.
            'accessibilityNote' => ['nullable', 'string', 'max:2000'],

            'interests' => ['array'],
            'interests.*' => ['string', 'max:64'],

            'acceptsRules' => ['accepted'],
        ];
    }

    /**
     * The wire is camelCase; the columns are snake_case. Mapped here so
     * the controller stays a controller and there's one obvious place to
     * look so the service keeps taking column-shaped keys.
     *
     * @return array<string, mixed>
     */
    public function toUserData(): array
    {
        $data = $this->validated();

        return [
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'pronoun' => $data['pronoun'] ?? null,
            'phone' => $data['phone'] ?? null,
            'accessibility_note' => $data['accessibilityNote'] ?? null,
            'interests' => $data['interests'] ?? [],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'acceptsRules.accepted' => 'Bitte bestätige die Hausregeln, um mitzumachen.',
        ];
    }
}
