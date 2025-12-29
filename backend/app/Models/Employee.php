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

        // private info
        'nik',
        'npwp',
        'phone',
        'address',

        // bank info
        'bank_name',
        'bank_account_name',
        'bank_account_number',
    ];

    // ❌ jangan dulu pakai encrypted cast (biar DB masuk normal)
    // protected $casts = [
    //     'nik' => 'encrypted',
    //     'npwp' => 'encrypted',
    //     'phone' => 'encrypted',
    //     'address' => 'encrypted',
    //     'bank_name' => 'encrypted',
    //     'bank_account_name' => 'encrypted',
    //     'bank_account_number' => 'encrypted',
    // ];

    public function payrolls()
    {
        return $this->hasMany(\App\Models\Payroll::class, 'employee_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function salaryProfiles()
    {
        return $this->hasMany(SalaryProfile::class);
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
