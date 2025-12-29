<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index()
    {
        // list aman: jangan kirim private info
        return Employee::orderBy('name')->get([
            'id',
            'employee_code',
            'name',
            'department',
            'position',
            'status',
            'user_id',
        ]);
    }

    public function show(Request $request, Employee $employee)
    {
        $user = $request->user();

        $isPrivileged = in_array($user->role, ['fat', 'director'], true);
        $isOwner = $employee->user_id && $employee->user_id === $user->id;

        $base = [
            'id' => $employee->id,
            'employee_code' => $employee->employee_code,
            'name' => $employee->name,
            'department' => $employee->department,
            'position' => $employee->position,
            'status' => $employee->status,
            'user_id' => $employee->user_id,
        ];

        // private info hanya untuk yang berhak
        if ($isPrivileged || $isOwner) {
            $base += [
                'nik' => $employee->nik,
                'npwp' => $employee->npwp,
                'phone' => $employee->phone,
                'address' => $employee->address,
                'bank_name' => $employee->bank_name,
                'bank_account_name' => $employee->bank_account_name,
                'bank_account_number' => $employee->bank_account_number,
            ];
        } else {
            $base['masked'] = true;
        }

        return response()->json($base);
    }

    public function salaryProfile(Request $request, Employee $employee)
    {
        $date = $request->query('date', now()->toDateString());
        $profile = $employee->currentSalaryProfile($date);

        if (!$profile) {
            return response()->json(['message' => 'Salary profile not found'], 404);
        }

        return response()->json([
            'employee_id' => $employee->id,
            'effective_from' => $profile->effective_from->toDateString(),
            'base_salary' => (string) $profile->base_salary,
            'allowance_fixed' => (string) $profile->allowance_fixed,
            'deduction_fixed' => (string) $profile->deduction_fixed,
            'suggested_total' => (string) (
                $profile->base_salary + $profile->allowance_fixed - $profile->deduction_fixed
            ),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_code' => ['required', 'string', 'max:50', 'unique:employees,employee_code'],
            'name' => ['required', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],

            // NOTE: samakan max dengan ukuran kolom di DB kamu
            'nik' => ['nullable', 'string', 'max:32'],
            'npwp' => ['nullable', 'string', 'max:32'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],

            'bank_name' => ['nullable', 'string', 'max:100'],
            'bank_account_name' => ['nullable', 'string', 'max:100'],
            'bank_account_number' => ['nullable', 'string', 'max:50'],
        ]);

        $data['user_id'] = null; // nanti linking user tahap 2

        $employee = Employee::create($data);

        // response aman: kirim field public aja
        return response()->json([
            'employee' => [
                'id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'name' => $employee->name,
                'department' => $employee->department,
                'position' => $employee->position,
                'status' => $employee->status,
                'user_id' => $employee->user_id,
            ],
        ], 201);
    }

    public function storeSalaryProfile(Request $request, Employee $employee)
{
    $data = $request->validate([
        'base_salary' => ['required', 'numeric', 'min:0'],
        'allowance_fixed' => ['nullable', 'numeric', 'min:0'],
        'deduction_fixed' => ['nullable', 'numeric', 'min:0'],
        'effective_from' => ['required', 'date'],

        // optional rate
        'daily_rate' => ['nullable', 'numeric', 'min:0'],
        'overtime_rate_per_hour' => ['nullable', 'numeric', 'min:0'],
        'late_penalty_per_minute' => ['nullable', 'numeric', 'min:0'],
    ]);

    $profile = $employee->salaryProfiles()->create([
        'base_salary' => $data['base_salary'],
        'allowance_fixed' => $data['allowance_fixed'] ?? 0,
        'deduction_fixed' => $data['deduction_fixed'] ?? 0,
        'daily_rate' => $data['daily_rate'] ?? null,
        'overtime_rate_per_hour' => $data['overtime_rate_per_hour'] ?? null,
        'late_penalty_per_minute' => $data['late_penalty_per_minute'] ?? null,
        'effective_from' => $data['effective_from'],
    ]);

    return response()->json([
        'salary_profile' => $profile,
    ], 201);
}
}
