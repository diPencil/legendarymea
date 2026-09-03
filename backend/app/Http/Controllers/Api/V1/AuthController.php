<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\Auth\ResetPasswordRequest;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Enums\UserStatus;
use App\Events\UserLoggedIn;
use App\Events\UserLoggedOut;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    use ApiResponse;

    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();
        
        $identifier = $credentials['identifier'] ?? $credentials['email'] ?? null;
        if (!$identifier) {
            return $this->errorResponse('Identifier or email is required.', [], 422);
        }

        $fieldType = filter_var($identifier, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
        $user = User::where($fieldType, $identifier)->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return $this->errorResponse(__('auth.failed'), [], 401);
        }

        if ($user->status === UserStatus::INACTIVE || $user->status === UserStatus::SUSPENDED) {
            return $this->errorResponse('Account is not active.', [], 403);
        }

        auth()->login($user);
        $user->update(['last_login_at' => now()]);
        $request->session()->regenerate();
        
        event(new UserLoggedIn($user, $request));

        return $this->successResponse([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'status' => $user->status->value,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ]
        ], 'Logged in successfully.');
    }

    public function logout(Request $request)
    {
        $user = auth()->user();
        if ($user) {
            event(new UserLoggedOut($user, $request));
        }
        
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        Auth::forgetGuards();

        return $this->successResponse(null, 'Logged out successfully.')
            ->withCookie(cookie(
                'XSRF-TOKEN',
                $request->session()->token(),
                config('session.lifetime'),
                config('session.path'),
                config('session.domain'),
                config('session.secure'),
                false,
                false,
                config('session.same_site')
            ));
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return $this->successResponse([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'status' => $user->status->value,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ]
        ], 'User data retrieved.');
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $status = Password::broker()->sendResetLink(
            $request->validated()
        );

        return $status === Password::RESET_LINK_SENT
                    ? $this->successResponse(null, __($status))
                    : $this->errorResponse(__($status), [], 400);
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $status = Password::broker()->reset(
            $request->validated(), function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
                    ? $this->successResponse(null, __($status))
                    : $this->errorResponse(__($status), [], 400);
    }
}
