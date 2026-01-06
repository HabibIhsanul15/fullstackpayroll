<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = [
        'user_id',
        'employee_code',
        'name',
        'department',
        'position',
        'status',

        // plaintext (transisi)
        'nik',
        'npwp',
        'phone',
        'address',
        'bank_name',
        'bank_account_name',
        'bank_account_number',

        // ciphertext
        'nik_enc',
        'npwp_enc',
        'phone_enc',
        'address_enc',
        'bank_account_number_enc',

        // metadata
        'pii_alg',
        'pii_key_id',
    ];

    public function payrolls()
    {
        return $this->hasMany(\App\Models\Payroll::class, 'employee_id');
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function salaryProfiles()
    {
        return $this->hasMany(\App\Models\SalaryProfile::class, 'employee_id');
    }

    public function currentSalaryProfile($date = null)
    {
        $date = $date ?: now()->toDateString();

        return $this->salaryProfiles()
            ->where('effective_from', '<=', $date)
            ->orderByDesc('effective_from')
            ->first();
    }
}
