<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        \Illuminate\Support\Facades\Event::listen(
            \App\Events\UserLoggedIn::class,
            \App\Listeners\LogUserLoginAudit::class
        );
        \Illuminate\Support\Facades\Event::listen(
            \App\Events\UserLoggedOut::class,
            \App\Listeners\LogUserLogoutAudit::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('super_admin') ? true : null;
        });

        \Illuminate\Support\Facades\Gate::policy(\App\Models\EmailMessage::class, \App\Policies\EmailPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Supplier::class, \App\Policies\SupplierPolicy::class);


        \Illuminate\Support\Facades\RateLimiter::for('login', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(5)->by($request->ip());
        });

        \Illuminate\Auth\Notifications\ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
