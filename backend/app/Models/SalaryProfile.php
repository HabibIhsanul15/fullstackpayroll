<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalaryProfile extends Model
{
    protected $fillable = [
        'employee_id',

        // plaintext (transisi)
        'base_salary',
        'allowance_fixed',
        'deduction_fixed',
        'daily_rate',
        'overtime_rate_per_hour',
        'late_penalty_per_minute',

        // ciphertext
        'base_salary_enc',
        'allowance_fixed_enc',
        'deduction_fixed_enc',
        'daily_rate_enc',
        'overtime_rate_per_hour_enc',
        'late_penalty_per_minute_enc',

        'effective_from',

        // metadata enkripsi
        'salary_alg',
        'salary_key_id',
    ];

    protected $casts = [
        'effective_from' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
