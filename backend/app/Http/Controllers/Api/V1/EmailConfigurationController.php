<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\EmailConfigurationService;
use App\Support\PermissionAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use RuntimeException;
use Throwable;

class EmailConfigurationController extends Controller
{
    public function __construct(private readonly EmailConfigurationService $emailConfiguration) {}

    public function show()
    {
        Gate::authorize('view_settings');

        return response()->json(['data' => $this->emailConfiguration->getForApi()]);
    }

    public function update(Request $request)
    {
        $this->authorizeManageEmailConfiguration($request);

        $validated = $this->validateConfiguration($request);

        return response()->json([
            'message' => 'Email configuration saved successfully.',
            'data' => $this->emailConfiguration->update($validated),
        ]);
    }

    public function testOutgoing(Request $request)
    {
        $this->authorizeManageEmailConfiguration($request);

        $validated = $request->validate(array_merge(
            $this->outgoingRules(true),
            ['test_recipient' => ['required', 'email', 'max:255']]
        ));

        try {
            $this->emailConfiguration->sendTestEmail($validated, $validated['test_recipient']);

            return response()->json([
                'success' => true,
                'message' => 'SMTP accepted the test email. Please check the recipient inbox and spam folder.',
                'data' => [
                    'recipient' => $validated['test_recipient'],
                ],
            ]);
        } catch (RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $this->emailConfiguration->safeError($exception->getMessage()),
            ], 422);
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => $this->emailConfiguration->safeError($exception->getMessage() ?: 'Unable to connect to SMTP server.'),
            ], 422);
        }
    }

    public function testIncoming(Request $request)
    {
        $this->authorizeManageEmailConfiguration($request);

        $validated = $request->validate($this->incomingRules(true));

        try {
            return response()->json([
                'message' => 'Incoming mailbox connection successful.',
                'data' => $this->emailConfiguration->testIncoming($validated),
            ]);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $this->emailConfiguration->safeError($exception->getMessage())], 422);
        } catch (Throwable) {
            return response()->json(['message' => 'Unable to connect to incoming mailbox.'], 422);
        }
    }

    private function validateConfiguration(Request $request): array
    {
        return $request->validate($this->configurationRules(true));
    }

    private function authorizeManageEmailConfiguration(Request $request): void
    {
        abort_unless(PermissionAccess::can($request->user(), 'update_settings', 'manage_settings'), 403);
    }

    private function configurationRules(bool $passwordsNullable): array
    {
        return array_merge($this->outgoingRules($passwordsNullable), $this->incomingRules($passwordsNullable));
    }

    private function outgoingRules(bool $passwordsNullable): array
    {
        return [
            'from_name' => ['required', 'string', 'max:255'],
            'from_email' => ['required', 'email', 'max:255'],
            'smtp_host' => ['required', 'string', 'max:255'],
            'smtp_port' => ['required', 'integer', 'min:1', 'max:65535'],
            'smtp_encryption' => ['required', 'string', 'in:none,tls,ssl'],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_password' => [$passwordsNullable ? 'nullable' : 'required', 'string', 'max:1000'],
            'smtp_auth_enabled' => ['required', 'boolean'],
            'smtp_timeout' => ['nullable', 'integer', 'min:1', 'max:300'],
        ];
    }

    private function incomingRules(bool $passwordsNullable): array
    {
        return [
            'incoming_protocol' => ['required', 'string', 'in:imap,pop3'],
            'incoming_host' => ['required', 'string', 'max:255'],
            'incoming_port' => ['required', 'integer', 'min:1', 'max:65535'],
            'incoming_encryption' => ['required', 'string', 'in:none,tls,ssl'],
            'incoming_username' => ['required', 'string', 'max:255'],
            'incoming_password' => [$passwordsNullable ? 'nullable' : 'required', 'string', 'max:1000'],
            'incoming_mailbox' => ['nullable', 'string', 'max:255'],
        ];
    }
}
