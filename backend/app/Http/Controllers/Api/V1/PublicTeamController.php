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
            ->orderBy('name')
            ->get();

        return PublicTeamMemberResource::collection($employees);
    }

    public function show(string $slug): PublicTeamMemberResource
    {
        abort_unless(preg_match('/-([a-z0-9]+)$/i', $slug, $matches), 404);

        $employee = Employee::query()
            ->with(['user.avatarMedia'])
            ->where('status', 'active')
            ->findOrFail((int) base_convert(strtolower($matches[1]), 36, 10));

        abort_unless((new PublicTeamMemberResource($employee))->publicSlug() === $slug, 404);

        return new PublicTeamMemberResource($employee);
    }
}
