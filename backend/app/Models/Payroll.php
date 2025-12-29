<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    protected $fillable = [
        'user_id',
        'employee_id',
        'periode',
        'gaji_pokok',
        'tunjangan',
        'potongan',
        'total',
        'catatan',
    ];

    protected $casts = [
        'periode' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(\App\Models\Employee::class);
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}
