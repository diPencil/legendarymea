<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = AuditLog::with('subject')->latest();

        // If not super admin, restrict viewable activity based on roles or 'my_activity'
        if (!$user->hasRole('super_admin')) {
            if ($request->has('my_activity') && filter_var($request->query('my_activity'), FILTER_VALIDATE_BOOLEAN)) {
                $query->where('user_id', $user->id);
            } else {
                // By default, non-super-admins should only see activity they caused, 
                // or we could expand this to include activity on records they own/manage.
                // For safety and privacy, default to their own actions if not super admin.
                $query->where('user_id', $user->id);
            }
        } else {
            if ($request->has('my_activity') && filter_var($request->query('my_activity'), FILTER_VALIDATE_BOOLEAN)) {
                $query->where('user_id', $user->id);
            }
        }

        if ($request->has('module')) {
            // Module is typically the first part of 'action', e.g. 'company.created' -> module = 'company'
            $module = strtolower($request->query('module'));
            $query->where('action', 'like', "{$module}.%");
        }
        
        if ($request->has('action_type')) {
            $actionType = strtolower($request->query('action_type'));
            $query->where('action', 'like', "%.{$actionType}");
        }
        
        if ($request->has('actor_id')) {
            $query->where('user_id', $request->query('actor_id'));
        }

        $activities = $query->paginate($request->query('per_page', 20));

        // Format for frontend
        $activities->getCollection()->transform(function ($audit) {
            return [
                'id' => $audit->id,
                'user_id' => $audit->user_id,
                'actor_name' => $audit->request_context['actor_name'] ?? 'System',
                'action' => $audit->action,
                'module' => $audit->request_context['module'] ?? explode('.', $audit->action)[0] ?? 'System',
                'action_type' => $audit->request_context['action_type'] ?? explode('.', $audit->action)[1] ?? 'updated',
                'subject_type' => class_basename($audit->subject_type),
                'subject_id' => $audit->subject_id,
                'entity_reference' => $audit->request_context['entity_reference'] ?? '',
                'title' => [
                    'en' => $audit->request_context['title_en'] ?? '',
                    'ar' => $audit->request_context['title_ar'] ?? '',
                ],
                'description' => [
                    'en' => $audit->request_context['description_en'] ?? '',
                    'ar' => $audit->request_context['description_ar'] ?? '',
                ],
                'old_values' => $audit->old_values,
                'new_values' => $audit->new_values,
                'metadata' => $audit->request_context['metadata'] ?? [],
                'created_at' => $audit->created_at,
            ];
        });

        return response()->json($activities);
    }
}
