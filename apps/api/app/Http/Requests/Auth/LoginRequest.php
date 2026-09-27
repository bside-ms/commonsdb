<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            // Shown in the token name so people can recognise a
            // session in a future "your devices" screen.
            'deviceName' => ['nullable', 'string', 'max:120'],
        ];
    }
}
