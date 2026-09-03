<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_catalog_id',
        'invoice_id',
        'description',
        'service_type',
        'service_name_snapshot',
        'service_details',
        'service_start_date',
        'service_end_date',
        'booking_reference',
        'supplier_id',
        'quantity',
        'unit_price',
        'purchase_unit_cost',
        'purchase_currency',
        'exchange_rate',
        'converted_unit_cost',
        'line_total',
        'converted_line_cost',
        'line_profit',
        'line_margin',
        'sort_order',
    ];

    protected $casts = [
        'service_start_date' => 'date',
        'service_end_date' => 'date',
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:4',
        'purchase_unit_cost' => 'decimal:4',
        'exchange_rate' => 'decimal:8',
        'converted_unit_cost' => 'decimal:4',
        'line_total' => 'decimal:4',
        'converted_line_cost' => 'decimal:4',
        'line_profit' => 'decimal:4',
        'line_margin' => 'decimal:4',
    ];

    public function serviceCatalog()
    {
        return $this->belongsTo(ServiceCatalog::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
