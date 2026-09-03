<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Career;
use App\Models\CareerApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PublicCareerController extends Controller
{
    public function index()
    {
        $careers = Career::where('status', 'published')
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('closing_date')
                    ->orWhereDate('closing_date', '>=', today());
            })
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json(['data' => $careers]);
    }

    public function show(Career $career)
    {
        if (!$career->is_active || $career->status !== 'published' || ($career->closing_date && $career->closing_date->isPast())) {
            abort(404);
        }
        return response()->json(['data' => $career]);
    }

    public function apply(Request $request, Career $career)
    {
        if (!$career->is_active || $career->status !== 'published' || ($career->closing_date && $career->closing_date->isPast())) {
            return response()->json(['message' => 'This position is no longer active.'], 400);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:255',
            'resume' => 'required|file|mimes:pdf,doc,docx|max:10240',
            'cover_letter' => 'nullable|string',
        ]);

        $path = $request->file('resume')->store('resumes', 'local');

        $application = CareerApplication::create([
            'reference' => $this->generateReference(),
            'career_id' => $career->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'resume_path' => $path,
            'cover_letter' => $validated['cover_letter'] ?? null,
            'status' => 'new',
        ]);

        return response()->json(['message' => 'Application submitted successfully.'], 201);
    }

    private function generateReference(): string
    {
        do {
            $reference = 'LM-CAP-'.now()->format('Y').'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (CareerApplication::query()->where('reference', $reference)->exists());

        return $reference;
    }
}
