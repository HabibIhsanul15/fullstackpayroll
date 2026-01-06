<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    protected $fillable = [
        'user_id',
        'employee_id',
        'periode',

        // plaintext (transisi)
        'gaji_pokok',
        'tunjangan',
        'potongan',
        'total',
        'catatan',

        // ciphertext
        'gaji_pokok_enc',
        'tunjangan_enc',
        'potongan_enc',
        'total_enc',
        'catatan_enc',

        // metadata enkripsi
        'salary_alg',
        'salary_key_id',
    ];

    protected $hidden = [
    'gaji_pokok_enc',
    'tunjangan_enc',
    'potongan_enc',
    'total_enc',
    'catatan_enc',
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
