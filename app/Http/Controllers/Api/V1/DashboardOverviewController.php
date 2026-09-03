<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\LeadStatus;
use App\Enums\OpportunityStage;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Employee;
use App\Models\Lead;
use App\Models\Opportunity;
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

        return response()->json([
            'data' => [
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
            ],
        ]);
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
}
