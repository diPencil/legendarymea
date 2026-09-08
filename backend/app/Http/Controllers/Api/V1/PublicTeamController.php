<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicTeamMemberResource;
use App\Models\Employee;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicTeamController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $employees = Employee::query()
            ->with(['user.avatarMedia'])
            ->where('status', 'active')
            ->where('show_on_team', true)
            ->whereHas('user', fn ($query) => $query->whereNotNull('username')->where('username', '!=', ''))
            ->orderBy('name')
            ->get();

        return PublicTeamMemberResource::collection($employees);
    }

    public function show(string $username): PublicTeamMemberResource
    {
        $employee = Employee::query()
            ->with(['user.avatarMedia'])
            ->where('status', 'active')
            ->where('show_on_team', true)
            ->whereHas('user', fn ($query) => $query->where('username', $username))
            ->firstOrFail();

        return new PublicTeamMemberResource($employee);
    }
}
