<?php

namespace App\Services;

use App\Services\SystemActivityService;

use App\Models\EmailMessage;
use App\Models\Setting;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Testing\Fakes\MailFake;
use RuntimeException;
use Throwable;

class EmailConfigurationService
{
    private const GROUP = 'email_configuration';

    private const DEFAULTS = [
        'from_name' => 'Legendary Management MEA',
        'from_email' => null,
        'smtp_host' => null,
        'smtp_port' => 587,
        'smtp_encryption' => 'tls',
        'smtp_username' => null,
        'smtp_auth_enabled' => true,
        'smtp_timeout' => 30,
        'incoming_protocol' => 'imap',
        'incoming_host' => null,
        'incoming_port' => 993,
        'incoming_encryption' => 'ssl',
        'incoming_username' => null,
        'incoming_mailbox' => 'INBOX',
    ];

    private const SECRET_KEYS = ['smtp_password', 'incoming_password'];

    public function getForApi(): array
    {
        $raw = $this->loadRaw();

        return array_merge($this->nonSecretConfiguration($raw), [
            'smtp_password_configured' => $this->hasSecret('smtp_password', $raw),
            'incoming_password_configured' => $this->hasSecret('incoming_password', $raw),
            'outgoing_configured' => $this->isOutgoingConfigured($raw),
            'incoming_configured' => $this->isIncomingConfigured($raw),
        ]);
    }

    public function update(array $data): array
    {
        $current = $this->loadRaw();

        foreach ($this->nonSecretConfiguration($data) as $key => $value) {
            $this->save($key, $value, is_bool($value) ? 'boolean' : 'string');
        }

        foreach (self::SECRET_KEYS as $key) {
            if (array_key_exists($key, $data) && filled($data[$key])) {
                $this->save($key, Crypt::encryptString((string) $data[$key]), 'encrypted');
            } elseif (!$this->hasSecret($key, $current)) {
                $this->save($key, null, 'encrypted');
            }
        }

        SystemActivityService::record(
            actor: auth()->user(),
            action: 'updated',
            module: 'Setting',
            entity: null,
            oldValues: [],
            newValues: [],
            metadata: []
        );

        return $this->getForApi();
    }

    public function sendEmailMessage(EmailMessage $email): void
    {
        $config = $this->outgoingMailerConfig();
        $this->applyOutgoingConfiguration($config);

        $this->deliverHtml($email->body, function ($message) use ($email, $config): void {
            $message
                ->from($config['from_email'], $config['from_name'])
                ->to($email->to_address, $email->to_name ?? null)
                ->subject($email->subject);

            foreach ($email->cc ?? [] as $ccAddress) {
                $message->cc($ccAddress);
            }

            foreach ($email->bcc ?? [] as $bccAddress) {
                $message->bcc($bccAddress);
            }
        });
    }

    public function sendTestEmail(array $override, string $recipient): void
    {
        $config = $this->outgoingMailerConfig($override);
        $this->applyOutgoingConfiguration($config);

        $this->deliverHtml(
            '<p>This is a test email confirming that the Legendary Management MEA outgoing email configuration is working correctly.</p>',
            function ($message) use ($recipient, $config): void {
                $message
                    ->from($config['from_email'], $config['from_name'])
                    ->to($recipient)
                    ->subject('Legendary Management MEA - Email Configuration Test');
            }
        );
    }

    public function testIncoming(array $override = []): array
    {
        $config = $this->incomingConfig($override);

        if (!extension_loaded('imap')) {
            throw new RuntimeException('PHP IMAP extension is not installed on this runtime.');
        }

        $flags = '/' . $config['protocol'];
        if ($config['encryption'] !== 'none') {
            $flags .= '/' . $config['encryption'];
        } else {
            $flags .= '/notls';
        }

        $mailboxPath = sprintf('{%s:%d%s}%s', $config['host'], $config['port'], $flags, $config['mailbox']);
        $connection = @imap_open($mailboxPath, $config['username'], $config['password'], OP_READONLY);

        if (!$connection) {
            throw new RuntimeException($this->safeError(imap_last_error() ?: 'Unable to connect to incoming mailbox.'));
        }

        try {
            $check = imap_check($connection);
            $unread = imap_search($connection, 'UNSEEN') ?: [];

            return [
                'mailbox' => $config['mailbox'],
                'message_count' => (int) ($check->Nmsgs ?? 0),
                'unread' => count($unread),
            ];
        } finally {
            imap_close($connection);
        }
    }

    public function outgoingMailerConfig(array $override = []): array
    {
        $raw = array_merge($this->loadRawWithSecrets(), $this->withoutBlankSecrets($override));
        $authEnabled = filter_var($raw['smtp_auth_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);

        if (blank($raw['from_name'] ?? null) || blank($raw['from_email'] ?? null) || blank($raw['smtp_host'] ?? null) || blank($raw['smtp_port'] ?? null)) {
            throw new RuntimeException('Outgoing email is not configured.');
        }

        if ($authEnabled && (blank($raw['smtp_username'] ?? null) || blank($raw['smtp_password'] ?? null))) {
            throw new RuntimeException('Outgoing email is not configured.');
        }

        return [
            'from_name' => (string) $raw['from_name'],
            'from_email' => (string) $raw['from_email'],
            'host' => (string) $raw['smtp_host'],
            'port' => (int) $raw['smtp_port'],
            'encryption' => ($raw['smtp_encryption'] ?? 'none') === 'none' ? null : (string) $raw['smtp_encryption'],
            'username' => $authEnabled ? (string) $raw['smtp_username'] : null,
            'password' => $authEnabled ? (string) $raw['smtp_password'] : null,
            'timeout' => (int) ($raw['smtp_timeout'] ?? 30),
        ];
    }

    private function incomingConfig(array $override = []): array
    {
        $raw = array_merge($this->loadRawWithSecrets(), $this->withoutBlankSecrets($override));

        if (blank($raw['incoming_host'] ?? null) || blank($raw['incoming_port'] ?? null) || blank($raw['incoming_username'] ?? null) || blank($raw['incoming_password'] ?? null)) {
            throw new RuntimeException('Incoming email is not configured.');
        }

        return [
            'protocol' => (string) ($raw['incoming_protocol'] ?? 'imap'),
            'host' => (string) $raw['incoming_host'],
            'port' => (int) $raw['incoming_port'],
            'encryption' => (string) ($raw['incoming_encryption'] ?? 'none'),
            'username' => (string) $raw['incoming_username'],
            'password' => (string) $raw['incoming_password'],
            'mailbox' => (string) ($raw['incoming_mailbox'] ?? 'INBOX'),
        ];
    }

    private function applyOutgoingConfiguration(array $config): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.from.address' => $config['from_email'],
            'mail.from.name' => $config['from_name'],
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.host' => $config['host'],
            'mail.mailers.smtp.port' => $config['port'],
            'mail.mailers.smtp.encryption' => $config['encryption'],
            'mail.mailers.smtp.username' => $config['username'],
            'mail.mailers.smtp.password' => $config['password'],
            'mail.mailers.smtp.timeout' => $config['timeout'],
        ]);

        if (!$this->mailIsFaked()) {
            app('mail.manager')->purge('smtp');
        }
    }

    private function deliverHtml(string $html, callable $callback): void
    {
        $sender = function (Message $message) use ($html, $callback): void {
            $message->html($this->prepareHtmlForOutgoingMessage($html, $message));
            $callback($message);
        };

        if ($this->mailIsFaked()) {
            Mail::send([], [], $sender);
            return;
        }

        Mail::mailer('smtp')->send([], [], $sender);
    }

    public function prepareHtmlForOutgoingMessage(string $html, ?Message $message = null): string
    {
        $prepared = preg_replace_callback('/\bsrc=(["\'])([^"\']+)\1/i', function (array $matches) use ($message): string {
            $quote = $matches[1];
            $src = html_entity_decode($matches[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $storagePath = $this->publicStoragePathFromUrl($src);

            if ($message && $storagePath && Storage::disk('public')->exists($storagePath)) {
                $absolutePath = Storage::disk('public')->path($storagePath);

                if (strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION)) === 'svg') {
                    throw new RuntimeException('SVG images cannot be safely embedded in emails due to poor client compatibility. Please upload a PNG or JPG version of this image instead.');
                }

                return 'src=' . $quote . e($message->embed($absolutePath)) . $quote;
            }

            if ($storagePath) {
                if (strtolower(pathinfo($storagePath, PATHINFO_EXTENSION)) === 'svg') {
                    throw new RuntimeException('SVG images cannot be safely embedded in emails due to poor client compatibility. Please upload a PNG or JPG version of this image instead.');
                }
                return 'src=' . $quote . e($this->absolutePublicStorageUrl($storagePath)) . $quote;
            }

            return $matches[0];
        }, $html) ?? $html;

        $this->assertNoUnsafeLocalImageSources($prepared);

        return $prepared;
    }

    private function mailIsFaked(): bool
    {
        return Mail::getFacadeRoot() instanceof MailFake;
    }

    private function publicStoragePathFromUrl(string $url): ?string
    {
        $decodedUrl = urldecode($url);
        
        if (preg_match('#/api/v1/media-files/(\d+)/content#', $decodedUrl, $matches)) {
            $mediaFile = \App\Models\MediaFile::find($matches[1]);
            if ($mediaFile && $mediaFile->disk === 'public') {
                return ltrim($mediaFile->path, '/');
            }
        }

        $publicBase = rtrim((string) config('filesystems.disks.public.url'), '/');
        $publicPath = parse_url($publicBase, PHP_URL_PATH) ?: '/storage';
        $inputPath = parse_url($decodedUrl, PHP_URL_PATH);

        if ($inputPath && str_starts_with($inputPath, rtrim($publicPath, '/') . '/')) {
            return ltrim(substr($inputPath, strlen(rtrim($publicPath, '/'))), '/');
        }

        if (str_starts_with($decodedUrl, '/storage/')) {
            return substr($decodedUrl, strlen('/storage/'));
        }

        return null;
    }

    private function absolutePublicStorageUrl(string $path): string
    {
        return rtrim((string) config('filesystems.disks.public.url'), '/') . '/' . ltrim($path, '/');
    }

    private function assertNoUnsafeLocalImageSources(string $html): void
    {
        if (!preg_match_all('/\bsrc=(["\'])([^"\']+)\1/i', $html, $matches)) {
            return;
        }

        foreach ($matches[2] as $source) {
            $source = html_entity_decode($source, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $lower = strtolower($source);

            if (str_starts_with($lower, 'cid:') || str_starts_with($lower, 'data:')) {
                continue;
            }

            if (str_starts_with($source, '/') || preg_match('/^[A-Z]:\\\\/i', $source) || str_contains($lower, 'localhost') || str_contains($lower, '127.0.0.1')) {
                throw new RuntimeException('Outgoing email contains a local or relative image URL. Upload the image through Media and use the saved template image.');
            }
        }
    }

    private function loadRawWithSecrets(): array
    {
        $raw = $this->loadRaw();

        foreach (self::SECRET_KEYS as $key) {
            $raw[$key] = $this->decryptSecret($raw[$key] ?? null);
        }

        return $raw;
    }

    private function loadRaw(): array
    {
        $settings = Setting::query()->where('group', self::GROUP)->pluck('value', 'key')->toArray();

        return array_merge(self::DEFAULTS, $settings);
    }

    private function nonSecretConfiguration(array $data): array
    {
        return array_diff_key($data, array_flip(self::SECRET_KEYS));
    }

    private function withoutBlankSecrets(array $data): array
    {
        foreach (self::SECRET_KEYS as $key) {
            if (array_key_exists($key, $data) && blank($data[$key])) {
                unset($data[$key]);
            }
        }

        return $data;
    }

    private function hasSecret(string $key, array $raw): bool
    {
        return filled($raw[$key] ?? null) && filled($this->decryptSecret($raw[$key] ?? null));
    }

    private function decryptSecret(?string $value): ?string
    {
        if (blank($value)) {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (Throwable) {
            return null;
        }
    }

    private function isOutgoingConfigured(array $raw): bool
    {
        return filled($raw['from_name'] ?? null)
            && filled($raw['from_email'] ?? null)
            && filled($raw['smtp_host'] ?? null)
            && filled($raw['smtp_port'] ?? null)
            && (!filter_var($raw['smtp_auth_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN) || (filled($raw['smtp_username'] ?? null) && $this->hasSecret('smtp_password', $raw)));
    }

    private function isIncomingConfigured(array $raw): bool
    {
        return filled($raw['incoming_protocol'] ?? null)
            && filled($raw['incoming_host'] ?? null)
            && filled($raw['incoming_port'] ?? null)
            && filled($raw['incoming_username'] ?? null)
            && $this->hasSecret('incoming_password', $raw);
    }

    private function save(string $key, mixed $value, string $type): void
    {
        Setting::query()->updateOrCreate(
            ['key' => $key],
            ['group' => self::GROUP, 'value' => is_bool($value) ? ($value ? '1' : '0') : $value, 'type' => $type]
        );
    }

    public function safeError(string $message): string
    {
        $message = preg_replace('/password=[^\\s&]+/i', 'password=[hidden]', $message) ?? $message;
        $message = preg_replace('/pass(?:word)?\\s*[:=]\\s*[^\\s]+/i', 'password [hidden]', $message) ?? $message;
        $message = preg_replace('/[A-Z]:\\\\[^\\s]+/i', '[path hidden]', $message) ?? $message;

        return trim($message) ?: 'Email connection failed.';
    }
}
