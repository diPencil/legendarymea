<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ReferenceGeneratorService
{
    /**
     * Generate a unique reference code safely using database locking.
     *
     * @param string $prefix E.g., 'LM-EMP-'
     * @param string $table The table to check. E.g., 'employees'
     * @param string $column The column name to check. E.g., 'employee_code'
     * @param int $padding Number of digits.
     * @return string
     */
    public function generate(string $prefix, string $table, string $column, int $padding = 6): string
    {
        return DB::transaction(function () use ($prefix, $table, $column, $padding) {
            // Get the maximum existing code for the given prefix
            // We lock the row/table implicitly by selecting for update, or just parse the max
            // Since selecting max string can be tricky, we can use DB::select
            // For MariaDB, we can extract the numeric part.
            // A simpler safe way is to keep a sequence table or lock the max row, but for now
            // we will query the max numeric part safely.
            
            // To avoid complex string parsing in SQL, we can fetch the latest record by id
            // But if IDs are not sequential with codes, it might fail.
            // Let's use a standard approach:
            $latest = DB::table($table)
                ->where($column, 'like', $prefix . '%')
                ->lockForUpdate() // lock for update to prevent concurrent generation race conditions
                ->orderByRaw('LENGTH(' . $column . ') DESC')
                ->orderBy($column, 'desc')
                ->first([$column]);

            if (! $latest) {
                $nextNumber = 1;
            } else {
                $lastCode = $latest->$column;
                // Robust extraction: take numeric suffix after last '-' to handle both
                // legacy codes (LM-CNT-2026196290) and current dash format (LM-CNT-2026-000001)
                if (str_contains($lastCode, '-')) {
                    $segments = explode('-', $lastCode);
                    $numberPart = (int) end($segments);
                } else {
                    $numberPart = (int) str_replace($prefix, '', $lastCode);
                }
                // Fallback if extraction fails (e.g. non-numeric suffix)
                if ($numberPart === 0 && ! str_ends_with($lastCode, '0')) {
                    $numberPart = (int) filter_var($lastCode, FILTER_SANITIZE_NUMBER_INT);
                    // Keep only last $padding digits if year included
                    $numberPart = $numberPart % (int) pow(10, $padding);
                }
                $nextNumber = $numberPart + 1;
            }

            return $prefix . str_pad((string)$nextNumber, $padding, '0', STR_PAD_LEFT);
        });
    }
}
