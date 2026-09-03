<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SettingController extends Controller
{
    private SettingsService $settingsService;

    public function __construct(SettingsService $settingsService)
    {
        $this->settingsService = $settingsService;
    }

    public function index(Request $request)
    {
        Gate::authorize('view_settings');

        if ($request->filled('group')) {
            $groupData = $this->settingsService->getGroup($request->group);
            return response()->json(['data' => $groupData]);
        }

        return response()->json(['data' => $this->settingsService->getAllGroups()]);
    }

    public function updateGroup(Request $request, string $group)
    {
        Gate::authorize('manage_settings');

        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        $updatedGroup = $this->settingsService->updateGroup($group, $validated['settings']);

        return response()->json([
            'message' => 'Settings updated successfully.',
            'data' => $updatedGroup
        ]);
    }

    public function publicSettings()
    {
        return response()->json(['data' => $this->settingsService->getPublicSettings()]);
    }
}
