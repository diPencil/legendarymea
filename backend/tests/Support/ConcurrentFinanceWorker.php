<?php

use App\Models\Payment;
use App\Models\User;
use App\Services\CompanyCreditService;
use App\Services\PaymentAllocationService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Validation\ValidationException;

putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = 'testing';
$_SERVER['APP_ENV'] = 'testing';

require dirname(__DIR__, 2) . '/vendor/autoload.php';

$app = require dirname(__DIR__, 2) . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$input = json_decode(base64_decode($argv[1] ?? ''), true, 512, JSON_THROW_ON_ERROR);
$startAt = (float) ($input['start_at'] ?? microtime(true));

while (microtime(true) < $startAt) {
    usleep(1000);
}

try {
    $user = User::findOrFail($input['user_id']);
    auth()->login($user);

    if ($input['operation'] === 'create_payment') {
        $payment = app(PaymentAllocationService::class)->createMultiInvoicePayment(
            $input['payload'],
            $user->id
        );

        echo json_encode(['status' => 'ok', 'payment_id' => $payment->id], JSON_THROW_ON_ERROR);
        exit(0);
    }

    $payment = Payment::findOrFail($input['payment_id']);
    $result = app(CompanyCreditService::class)->applyCredit($payment, $input['payload'], $user->id);

    echo json_encode([
        'status' => 'ok',
        'allocation_ids' => collect($result['allocations'])->pluck('id')->all(),
    ], JSON_THROW_ON_ERROR);
} catch (ValidationException $exception) {
    echo json_encode(['status' => 'validation', 'errors' => $exception->errors()], JSON_THROW_ON_ERROR);
    exit(2);
} catch (Throwable $exception) {
    echo json_encode([
        'status' => 'error',
        'type' => $exception::class,
        'message' => $exception->getMessage(),
    ], JSON_THROW_ON_ERROR);
    exit(1);
}
