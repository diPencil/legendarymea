<?php

namespace App\Services;

use App\Enums\EmailStatus;
use App\Enums\UserStatus;
use App\Models\Company;
use App\Models\EmailMessage;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

class ClientPortalAccessService
{
    public function provisionPrimaryUser(Company $company, string $email, ?User $actor = null): User
    {
        $password = Str::password(18);

        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $company->name,
                'username' => $this->uniqueUsername($company->name),
                'password' => Hash::make($password),
                'status' => UserStatus::INVITED->value,
                'company_id' => $company->id,
                'must_change_password' => true,
                'portal_invited_at' => now(),
            ]
        );

        if (!$user->hasRole('client')) {
            $user->assignRole('client');
        }

        $user->forceFill([
            'company_id' => $company->id,
            'password' => Hash::make($password),
            'must_change_password' => true,
            'portal_disabled_at' => null,
        ]);

        if (!$user->portal_invited_at) {
            $user->portal_invited_at = now();
        }

        $user->save();

        SystemActivityService::record(
            actor: $actor,
            action: 'portal_provisioned',
            module: 'Company',
            entity: $company,
            oldValues: [],
            newValues: ['client_user_id' => $user->id, 'email' => $user->email],
            metadata: []
        );

        $this->sendWelcomeEmail($company, $user, $password, $actor);

        return $user;
    }

    public function resendInvite(Company $company, User $user, ?User $actor = null): void
    {
        $password = Str::password(18);
        $user->forceFill([
            'password' => Hash::make($password),
            'must_change_password' => true,
            'portal_invited_at' => now(),
            'portal_disabled_at' => null,
            'status' => UserStatus::INVITED->value,
        ])->save();

        $this->sendWelcomeEmail($company, $user, $password, $actor);
    }

    public function disable(Company $company, ?User $actor = null): void
    {
        $company->clientUsers()->get()->each(function (User $user): void {
            $user->forceFill([
                'status' => UserStatus::INACTIVE->value,
                'portal_disabled_at' => now(),
            ])->save();
        });

        SystemActivityService::record(
            actor: $actor,
            action: 'portal_disabled',
            module: 'Company',
            entity: $company,
            oldValues: [],
            newValues: [],
            metadata: []
        );
    }

    private function sendWelcomeEmail(Company $company, User $user, string $temporaryPassword, ?User $actor): void
    {
        $email = EmailMessage::create([
            'reference' => $this->emailReference(),
            'subject' => 'Your Legendary Management MEA Client Portal Access',
            'body' => view('emails.client-portal-welcome', [
                'company' => $company,
                'user' => $user,
                'temporaryPassword' => $temporaryPassword,
                'portalUrl' => 'https://legendarymea.com/portal/login',
            ])->render(),
            'to_address' => $user->email,
            'to_name' => $user->name,
            'status' => EmailStatus::DRAFT,
            'created_by' => $actor?->id,
        ]);

        try {
            app(EmailConfigurationService::class)->sendEmailMessage($email);
            $email->update(['status' => EmailStatus::SENT, 'sent_at' => now()]);
            SystemActivityService::record(
                actor: $actor,
                action: 'portal_invite_sent',
                module: 'Company',
                entity: $company,
                oldValues: [],
                newValues: ['client_user_id' => $user->id],
                metadata: []
            );
        } catch (Throwable $exception) {
            $email->update([
                'status' => EmailStatus::FAILED,
                'failure_message' => app(EmailConfigurationService::class)->safeError($exception->getMessage()),
            ]);
            SystemActivityService::record(
                actor: $actor,
                action: 'portal_invite_failed',
                module: 'Company',
                entity: $company,
                oldValues: [],
                newValues: ['client_user_id' => $user->id],
                metadata: []
            );
        }
    }

    private function uniqueUsername(string $name): string
    {
        $base = Str::slug($name) ?: 'client';
        $username = $base;
        $suffix = 1;

        while (User::query()->where('username', $username)->exists()) {
            $suffix++;
            $username = "{$base}.{$suffix}";
        }

        return $username;
    }

    private function emailReference(): string
    {
        do {
            $reference = 'LM-EML-' . now()->format('Y') . '-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (EmailMessage::query()->where('reference', $reference)->exists());

        return $reference;
    }
}
