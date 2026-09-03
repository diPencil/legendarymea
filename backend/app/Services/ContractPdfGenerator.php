<?php

namespace App\Services;

use App\Models\Contract;
use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;

class ContractPdfGenerator
{
    public function __construct(private readonly ContractPdfHtmlRenderer $renderer) {}

    public function generate(Contract $contract): ContractPdfFile
    {
        $workDir = storage_path('app/private/contract-pdf/' . uniqid('contract-', true));
        File::ensureDirectoryExists($workDir);

        $htmlPath = $workDir . DIRECTORY_SEPARATOR . 'contract.html';
        $pdfPath = $workDir . DIRECTORY_SEPARATOR . $this->filename($contract);
        $userDataDir = $workDir . DIRECTORY_SEPARATOR . 'chrome-profile';

        try {
            File::put($htmlPath, $this->renderer->render($contract));

            $process = new Process([
                $this->chromeExecutable(),
                '--headless=new',
                '--disable-gpu',
                '--no-sandbox',
                '--allow-file-access-from-files',
                '--disable-dev-shm-usage',
                '--run-all-compositor-stages-before-draw',
                '--virtual-time-budget=1000',
                '--print-to-pdf-no-header',
                '--print-to-pdf=' . $pdfPath,
                '--user-data-dir=' . $userDataDir,
                $this->fileUrl($htmlPath),
            ]);
            $process->setTimeout(60);
            $process->run();

            if (! $process->isSuccessful() || ! is_file($pdfPath) || filesize($pdfPath) === 0) {
                throw new RuntimeException('Contract PDF generation failed: ' . trim($process->getErrorOutput() ?: $process->getOutput()));
            }

            return new ContractPdfFile($this->filename($contract), (string) File::get($pdfPath));
        } finally {
            File::deleteDirectory($workDir);
        }
    }

    public function filename(Contract $contract): string
    {
        $reference = preg_replace('/[^A-Za-z0-9._-]+/', '-', $contract->reference) ?: 'contract';

        return trim($reference, '.-') . '.pdf';
    }

    private function chromeExecutable(): string
    {
        $configured = env('CONTRACT_PDF_CHROME_PATH');
        if ($configured && is_file($configured)) {
            return $configured;
        }

        $candidates = PHP_OS_FAMILY === 'Windows'
            ? [
                'C:\Program Files\Google\Chrome\Application\chrome.exe',
                'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
                'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
                'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            ]
            : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        throw new RuntimeException('Chrome or Edge executable was not found for Contract PDF generation.');
    }

    private function fileUrl(string $path): string
    {
        $path = str_replace(DIRECTORY_SEPARATOR, '/', realpath($path) ?: $path);
        if (PHP_OS_FAMILY === 'Windows' && ! str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        return 'file://' . $path;
    }
}
