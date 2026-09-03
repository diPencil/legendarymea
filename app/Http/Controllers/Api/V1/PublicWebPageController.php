<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\WebPage;

class PublicWebPageController extends Controller
{
    public function show($slug)
    {
        $page = WebPage::where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();
            
        return response()->json(['data' => $page]);
    }
}
