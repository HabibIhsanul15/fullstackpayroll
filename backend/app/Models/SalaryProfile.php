<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalaryProfile extends Model
{
    protected $fillable = [
        'employee_id','base_salary','allowance_fixed','deduction_fixed',
        'daily_rate','overtime_rate_per_hour','late_penalty_per_minute',
        'effective_from'
    ];

    protected $casts = [
        'effective_from' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
