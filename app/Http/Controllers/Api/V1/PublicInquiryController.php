<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\InquiryStatus;
use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use Illuminate\Http\Request;

class PublicInquiryController extends Controller
{
    /**
     * Store a newly created public inquiry.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $validated['reference'] = 'LM-INQ-' . date('Y') . '-' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);
        $validated['status'] = InquiryStatus::NEW;
        
        // Ensure public client cannot control these fields
        $validated['assigned_to'] = null;
        $validated['internal_notes'] = null;
        $validated['resolved_at'] = null;
        
        // Add company to message if provided
        if (!empty($validated['company'])) {
            $validated['message'] = "Company: {$validated['company']}\n\n" . $validated['message'];
        }
        unset($validated['company']);

        $inquiry = Inquiry::create($validated);

        return response()->json(['message' => 'Inquiry submitted successfully', 'reference' => $inquiry->reference], 201);
    }
}
