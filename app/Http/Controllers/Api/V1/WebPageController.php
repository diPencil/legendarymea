<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\WebPage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class WebPageController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', WebPage::class);

        $query = WebPage::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'title', 'slug', 'status'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 100) $perPage = 15;

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        Gate::authorize('create', WebPage::class);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:web_pages,slug',
            'content' => 'nullable|string',
            'status' => 'required|string|in:draft,published,archived',
            'meta_data' => 'nullable|array',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        $webPage = WebPage::create($validated);

        return response()->json(['data' => $webPage], 201);
    }

    public function show(WebPage $webPage)
    {
        Gate::authorize('view', $webPage);
        return response()->json(['data' => $webPage]);
    }

    public function update(Request $request, WebPage $webPage)
    {
        Gate::authorize('update', $webPage);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:web_pages,slug,' . $webPage->id,
            'content' => 'nullable|string',
            'status' => 'required|string|in:draft,published,archived',
            'meta_data' => 'nullable|array',
        ]);

        $webPage->update($validated);

        return response()->json(['data' => $webPage]);
    }

    public function destroy(WebPage $webPage)
    {
        Gate::authorize('delete', $webPage);
        $webPage->delete();
        return response()->noContent();
    }
}
