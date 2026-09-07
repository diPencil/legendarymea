<?php

namespace App\Services;

use App\Enums\EmailStatus;
use App\Enums\UserStatus;
use App\Models\EmailMessage;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

class EmployeeAccountAccessService
{
    private const LOGIN_URL = 'https://legendarymea.com/dashboard/login';

    public function sendInvite(Employee $employee, User $user, string $temporaryPassword, ?User $actor = null): void
    {
        $email = EmailMessage::create([
            'reference' => $this->emailReference(),
            'subject' => 'Your Legendary Management MEA Internal Dashboard Access',
            'body' => view('emails.employee-account-welcome', [
                'employee' => $employee,
                'user' => $user,
                'temporaryPassword' => $temporaryPassword,
                'loginUrl' => self::LOGIN_URL,
            ])->render(),
            'to_address' => $user->email,
            'to_name' => $user->name,
            'status' => EmailStatus::DRAFT,
            'created_by' => $actor?->id,
        ]);

        try {
            app(EmailConfigurationService::class)->sendEmailMessage($email);
            $email->update(['status' => EmailStatus::SENT, 'sent_at' => now()]);
            $user->forceFill([
                'account_invite_status' => 'sent',
                'account_invited_at' => now(),
                'account_invite_failed_at' => null,
            ])->save();

            SystemActivityService::record(
                actor: $actor,
                action: 'employee_invite_sent',
                module: 'Employee',
                entity: $employee,
                oldValues: [],
                newValues: ['user_id' => $user->id, 'email' => $user->email],
                metadata: []
            );
        } catch (Throwable $exception) {
            $email->update([
                'status' => EmailStatus::FAILED,
                'failure_message' => app(EmailConfigurationService::class)->safeError($exception->getMessage()),
            ]);
            $user->forceFill([
                'account_invite_status' => 'failed',
                'account_invite_failed_at' => now(),
            ])->save();

            SystemActivityService::record(
                actor: $actor,
                action: 'employee_invite_failed',
                module: 'Employee',
                entity: $employee,
                oldValues: [],
                newValues: ['user_id' => $user->id],
                metadata: []
            );
        }
    }

    public function resetTemporaryPassword(Employee $employee, ?User $actor = null): void
    {
        $user = $this->employeeUser($employee);
        $password = Str::password(18);

        $user->forceFill([
            'password' => Hash::make($password),
            'must_change_password' => true,
            'status' => UserStatus::INVITED->value,
        ])->save();

        SystemActivityService::record(
            actor: $actor,
            action: 'employee_temporary_password_reset',
            module: 'Employee',
            entity: $employee,
            oldValues: [],
            newValues: ['user_id' => $user->id],
            metadata: []
        );

        $this->sendInvite($employee, $user, $password, $actor);
    }

    public function resendInvite(Employee $employee, ?User $actor = null): void
    {
        $this->resetTemporaryPassword($employee, $actor);
    }

    public function disable(Employee $employee, ?User $actor = null): void
    {
        $user = $this->employeeUser($employee);
        $user->forceFill(['status' => UserStatus::INACTIVE->value])->save();

        SystemActivityService::record(
            actor: $actor,
            action: 'employee_account_disabled',
            module: 'Employee',
            entity: $employee,
            oldValues: [],
            newValues: ['user_id' => $user->id],
            metadata: []
        );
    }

    public function enable(Employee $employee, ?User $actor = null): void
    {
        $user = $this->employeeUser($employee);
        $user->forceFill(['status' => UserStatus::ACTIVE->value])->save();

        SystemActivityService::record(
            actor: $actor,
            action: 'employee_account_enabled',
            module: 'Employee',
            entity: $employee,
            oldValues: [],
            newValues: ['user_id' => $user->id],
            metadata: []
        );
    }

    private function employeeUser(Employee $employee): User
    {
        abort_unless($employee->user, 404, __('Employee has no linked user account.'));

        return $employee->user;
    }

    private function emailReference(): string
    {
        do {
            $reference = 'LM-EML-' . now()->format('Y') . '-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (EmailMessage::query()->where('reference', $reference)->exists());

        return $reference;
    }
}
