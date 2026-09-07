<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ContractStatus;
use App\Enums\EmailStatus;
use App\Enums\LeadStatus;
use App\Enums\OpportunityStage;
use App\Enums\PaymentStatus;
use App\Enums\QuotationStatus;
use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Contract;
use App\Models\EmailMessage;
use App\Models\Employee;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\Request as ClientRequest;
use App\Models\User;
use App\Support\PermissionAccess;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardOverviewController extends Controller
{
    private const TOTALS = [
        ['key' => 'employees', 'model' => Employee::class, 'permission' => 'view_employees'],
        ['key' => 'companies', 'model' => Company::class, 'permission' => 'view_companies'],
        ['key' => 'contacts', 'model' => Contact::class, 'permission' => 'view_contacts'],
        ['key' => 'leads', 'model' => Lead::class, 'permission' => 'view_leads'],
        ['key' => 'opportunities', 'model' => Opportunity::class, 'permission' => 'view_opportunities'],
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $period = $this->period($request);
        [$from, $to] = $this->periodRange($period);

        return response()->json([
            'data' => [
                'period' => $period,
                'totals' => collect(self::TOTALS)->map(fn (array $metric) => $this->metric($metric, $user))->values(),
                'lead_snapshot' => PermissionAccess::canView($user, 'leads')
                    ? $this->breakdown(Lead::class, 'status', [
                        LeadStatus::NEW->value,
                        LeadStatus::CONTACTED->value,
                        LeadStatus::QUALIFIED->value,
                    ])
                    : [],
                'pipeline_snapshot' => PermissionAccess::canView($user, 'opportunities')
                    ? $this->breakdown(Opportunity::class, 'stage', [
                        OpportunityStage::QUALIFICATION->value,
                        OpportunityStage::DISCOVERY->value,
                        OpportunityStage::PROPOSAL->value,
                        OpportunityStage::NEGOTIATION->value,
                    ])
                    : [],
                'activity_report' => $this->activityReport($user, $from, $to),
                'recent_activity' => $this->recentActivity($user),
                'email_snapshot' => PermissionAccess::canView($user, 'emails')
                    ? $this->breakdown(EmailMessage::class, 'status', [
                        EmailStatus::SENT->value,
                        EmailStatus::DRAFT->value,
                        EmailStatus::FAILED->value,
                        EmailStatus::CANCELLED->value,
                    ])
                    : [],
                'contract_snapshot' => PermissionAccess::canView($user, 'contracts')
                    ? $this->breakdown(Contract::class, 'status', [
                        ContractStatus::DRAFT->value,
                        ContractStatus::ACTIVE->value,
                        ContractStatus::EXPIRED->value,
                        ContractStatus::TERMINATED->value,
                        ContractStatus::CANCELLED->value,
                    ])
                    : [],
                'finance_trend' => PermissionAccess::canView($user, 'payments')
                    ? $this->financeTrend()
                    : null,
                'quotation_snapshot' => PermissionAccess::canView($user, 'quotations')
                    ? $this->breakdown(Quotation::class, 'status', [
                        QuotationStatus::DRAFT->value,
                        QuotationStatus::SENT->value,
                        QuotationStatus::ACCEPTED->value,
                        QuotationStatus::REJECTED->value,
                        QuotationStatus::EXPIRED->value,
                        QuotationStatus::CANCELLED->value,
                    ])
                    : [],
                'request_snapshot' => PermissionAccess::canView($user, 'requests')
                    ? $this->breakdown(ClientRequest::class, 'status', [
                        RequestStatus::NEW->value,
                        RequestStatus::ASSIGNED->value,
                        RequestStatus::IN_PROGRESS->value,
                        RequestStatus::WAITING_CLIENT->value,
                        RequestStatus::COMPLETED->value,
                        RequestStatus::CANCELLED->value,
                    ])
                    : [],
            ],
        ]);
    }

    public function financeTrendEndpoint(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!PermissionAccess::canView($user, 'payments')) {
            return response()->json(['data' => null]);
        }

        $validated = $request->validate([
            'from' => ['nullable', 'date_format:Y-m'],
            'to' => ['nullable', 'date_format:Y-m'],
        ]);

        return response()->json(['data' => $this->financeTrend(
            isset($validated['from']) ? $validated['from'] : null,
            isset($validated['to']) ? $validated['to'] : null,
        )]);
    }

    /**
     * Monthly collected revenue from posted payments for a month range.
     * Defaults to the last 6 months. The range is capped at 12 months.
     *
     * @return array{currency: string|null, points: list<array{key: string, label: string, revenue: float, count: int, average: float}>}
     */
    private function financeTrend(?string $from = null, ?string $to = null): array
    {
        $end = $to ? \Carbon\Carbon::parse($to . '-01')->endOfMonth() : now()->endOfMonth();
        $start = $from ? \Carbon\Carbon::parse($from . '-01')->startOfMonth() : $end->copy()->subMonthsNoOverflow(5)->startOfMonth();
        if ($start->greaterThan($end)) {
            [$start, $end] = [$end->copy()->startOfMonth(), $start->copy()->endOfMonth()];
        }
        if ($start->diffInMonths($end) > 11) {
            $start = $end->copy()->subMonthsNoOverflow(11)->startOfMonth();
        }

        $months = [];
        $cursor = $start->copy();
        while ($cursor->lessThanOrEqualTo($end)) {
            $months[] = $cursor->copy();
            $cursor->addMonthNoOverflow();
        }

        $currency = Payment::query()
            ->where('status', PaymentStatus::POSTED->value)
            ->select('currency', DB::raw('sum(amount) as aggregate'))
            ->groupBy('currency')
            ->orderByDesc('aggregate')
            ->value('currency');

        $points = collect($months)->map(function ($month) use ($currency) {
            $from = $month->copy()->startOfMonth();
            $to = $month->copy()->endOfMonth();

            $query = Payment::query()
                ->where('status', PaymentStatus::POSTED->value)
                ->whereBetween('paid_at', [$from, $to]);
            if ($currency) {
                $query->where('currency', $currency);
            }

            $revenue = (float) $query->sum('amount');
            $count = (int) (clone $query)->count();

            return [
                'key' => $from->format('Y-m'),
                'label' => $from->format('M'),
                'revenue' => round($revenue, 2),
                'count' => $count,
                'average' => $count > 0 ? round($revenue / $count, 2) : 0,
            ];
        })->values()->all();

        return ['currency' => $currency, 'points' => $points];
    }

    private function metric(array $metric, mixed $user): array
    {
        if (!PermissionAccess::can($user, $metric['permission'])) {
            return [
                'key' => $metric['key'],
                'total' => null,
                'status' => 'denied',
            ];
        }

        /** @var class-string<Model> $model */
        $model = $metric['model'];

        return [
            'key' => $metric['key'],
            'total' => $model::query()->count(),
            'status' => 'ready',
        ];
    }

    /**
     * @param class-string<Model> $model
     * @param list<string> $values
     */
    private function breakdown(string $model, string $column, array $values): array
    {
        $counts = $model::query()
            ->select($column, DB::raw('count(*) as aggregate'))
            ->whereIn($column, $values)
            ->groupBy($column)
            ->pluck('aggregate', $column);

        return collect($values)->map(fn (string $value) => [
            'key' => $value,
            'total' => (int) ($counts[$value] ?? 0),
            'status' => 'ready',
        ])->values()->all();
    }

    private function period(Request $request): string
    {
        $period = (string) $request->query('period', 'month');

        return in_array($period, ['today', 'month', 'year'], true) ? $period : 'month';
    }

    private function periodRange(string $period): array
    {
        return match ($period) {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'year' => [now()->startOfYear(), now()->endOfYear()],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };
    }

    private function activityReport(mixed $user, mixed $from, mixed $to): array
    {
        $cards = [
            ['key' => 'new_companies', 'model' => Company::class, 'permission' => 'view_companies'],
            ['key' => 'new_contacts', 'model' => Contact::class, 'permission' => 'view_contacts'],
            ['key' => 'new_leads', 'model' => Lead::class, 'permission' => 'view_leads'],
            ['key' => 'new_opportunities', 'model' => Opportunity::class, 'permission' => 'view_opportunities'],
            ['key' => 'new_requests', 'model' => ClientRequest::class, 'permission' => 'view_requests'],
        ];

        return collect($cards)->map(function (array $card) use ($user, $from, $to) {
            if (!PermissionAccess::can($user, $card['permission'])) {
                return [
                    'key' => $card['key'],
                    'total' => null,
                    'status' => 'denied',
                ];
            }

            /** @var class-string<Model> $model */
            $model = $card['model'];

            return [
                'key' => $card['key'],
                'total' => $model::query()->whereBetween('created_at', [$from, $to])->count(),
                'status' => 'ready',
            ];
        })->values()->all();
    }

    private function recentActivity(User $user): array
    {
        $query = AuditLog::query()->latest()->limit(5);

        if (! PermissionAccess::hasRole($user, 'super_admin')) {
            $query->where('user_id', $user->id);
        }

        return $query->get()->map(function (AuditLog $audit): array {
            $context = $audit->request_context ?? [];

            return [
                'id' => $audit->id,
                'actor_name' => $context['actor_name'] ?? 'System',
                'module' => $context['module'] ?? explode('.', $audit->action)[0] ?? 'System',
                'title' => [
                    'en' => $context['title_en'] ?? '',
                    'ar' => $context['title_ar'] ?? '',
                ],
                'description' => [
                    'en' => $context['description_en'] ?? '',
                    'ar' => $context['description_ar'] ?? '',
                ],
                'created_at' => $audit->created_at,
            ];
        })->values()->all();
    }
}
