<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\LegendaryContractTemplate;

class ContractTemplateController extends Controller
{
    public function index()
    {
        return response()->json(['data' => LegendaryContractTemplate::getDefaultTemplate()]);
    }
}
