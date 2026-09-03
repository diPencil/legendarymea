<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;

class ProfileController extends Controller
{
    use ApiResponse;

    public function show(Request $request, $username)
    {
        // 1. Genuinely use the URL username as the canonical identifier.
        // 2. unauthorized other-user profile access blocked
        if ($request->user()->username !== $username) {
            return $this->errorResponse('Unauthorized profile access.', [], 403);
        }

        $user = User::where('username', $username)->first();

        if (!$user) {
            return $this->errorResponse('Profile not found.', [], 404);
        }

        return $this->successResponse([
            'profile' => [
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'status' => $user->status->value,
                'roles' => $user->getRoleNames(),
            ]
        ], 'Profile retrieved successfully.');
    }
}
