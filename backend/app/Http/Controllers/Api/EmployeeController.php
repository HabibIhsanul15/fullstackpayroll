<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use App\Services\CryptoService;



class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $qStatus = $request->query('status'); // "active" / "inactive" / null

        $query = Employee::query()->orderBy('name');

        if ($qStatus) {
            $query->where('status', $qStatus);
        }

        // list aman: jangan kirim private info
        return $query->get([
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
            'nik' => $employee->nik_enc ? CryptoService::decryptAESGCM($employee->nik_enc) : $employee->nik,
            'npwp' => $employee->npwp_enc ? CryptoService::decryptAESGCM($employee->npwp_enc) : $employee->npwp,
            'phone' => $employee->phone_enc ? CryptoService::decryptAESGCM($employee->phone_enc) : $employee->phone,
            'address' => $employee->address_enc ? CryptoService::decryptAESGCM($employee->address_enc) : $employee->address,
            'bank_account_number' => $employee->bank_account_number_enc
                ? CryptoService::decryptAESGCM($employee->bank_account_number_enc)
                : $employee->bank_account_number,
            ];
        } else {
            $base['masked'] = true;
        }

        return response()->json($base);
    }

public function createUser(Request $request, Employee $employee)
{
    $actor = $request->user();

    // ✅ hanya FAT/Direktur boleh bikin akun
    if (!in_array($actor->role, ['fat', 'director'], true)) {
        return response()->json(['message' => 'Forbidden'], 403);
    }

    // ✅ employee sudah punya akun?
    if ($employee->user_id) {
        return response()->json(['message' => 'Employee ini sudah punya akun.'], 422);
    }

    // ✅ validasi mirip register
    $data = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        'role' => ['required', Rule::in(['fat', 'director'])],

        // ✅ password input manual
        'password' => ['required', 'string', 'min:8', 'confirmed'],
        // confirmed -> butuh field password_confirmation
    ]);

    $user = User::create([
        'name' => $data['name'],
        'email' => $data['email'],
        'role' => $data['role'],
        'password' => Hash::make($data['password']),
    ]);

    // link ke employee
    $employee->update(['user_id' => $user->id]);

    return response()->json([
        'message' => 'Akun berhasil dibuat.',
        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ],
    ], 201);
}

    public function salaryProfile(Request $request, Employee $employee)
    {
        $date = $request->query('date', now()->toDateString());
        $profile = $employee->currentSalaryProfile($date);

        if (!$profile) {
            return response()->json(['message' => 'Salary profile not found'], 404);
        }

        // prefer decrypt kalau ada ciphertext
        $base = $profile->base_salary_enc ? (float) CryptoService::decryptAESGCM($profile->base_salary_enc) : (float) $profile->base_salary;
        $allow = $profile->allowance_fixed_enc ? (float) CryptoService::decryptAESGCM($profile->allowance_fixed_enc) : (float) $profile->allowance_fixed;
        $ded = $profile->deduction_fixed_enc ? (float) CryptoService::decryptAESGCM($profile->deduction_fixed_enc) : (float) $profile->deduction_fixed;

        return response()->json([
            'employee_id' => $employee->id,
            'effective_from' => $profile->effective_from->toDateString(),
            'base_salary' => (string) $base,
            'allowance_fixed' => (string) $allow,
            'deduction_fixed' => (string) $ded,
            'suggested_total' => (string) ($base + $allow - $ded),
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

            'nik' => ['nullable', 'string', 'max:32'],
            'npwp' => ['nullable', 'string', 'max:32'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],

            'bank_name' => ['nullable', 'string', 'max:100'],
            'bank_account_name' => ['nullable', 'string', 'max:100'],
            'bank_account_number' => ['nullable', 'string', 'max:50'],
        ]);

        $data['user_id'] = null; // linking user tahap 2

        $employee = Employee::create($data);

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

        'daily_rate' => ['nullable', 'numeric', 'min:0'],
        'overtime_rate_per_hour' => ['nullable', 'numeric', 'min:0'],
        'late_penalty_per_minute' => ['nullable', 'numeric', 'min:0'],
    ]);

    $base = (float) $data['base_salary'];
    $allow = (float) ($data['allowance_fixed'] ?? 0);
    $ded = (float) ($data['deduction_fixed'] ?? 0);

    $daily = array_key_exists('daily_rate', $data) ? (float) ($data['daily_rate'] ?? 0) : null;
    $ot    = array_key_exists('overtime_rate_per_hour', $data) ? (float) ($data['overtime_rate_per_hour'] ?? 0) : null;
    $late  = array_key_exists('late_penalty_per_minute', $data) ? (float) ($data['late_penalty_per_minute'] ?? 0) : null;

    $profile = $employee->salaryProfiles()->create([
        // plaintext (transisi)
        'base_salary' => $base,
        'allowance_fixed' => $allow,
        'deduction_fixed' => $ded,
        'daily_rate' => $daily,
        'overtime_rate_per_hour' => $ot,
        'late_penalty_per_minute' => $late,
        'effective_from' => $data['effective_from'],

        // ciphertext
        'base_salary_enc' => CryptoService::encryptAESGCM((string)$base),
        'allowance_fixed_enc' => CryptoService::encryptAESGCM((string)$allow),
        'deduction_fixed_enc' => CryptoService::encryptAESGCM((string)$ded),
        'daily_rate_enc' => $daily !== null ? CryptoService::encryptAESGCM((string)$daily) : null,
        'overtime_rate_per_hour_enc' => $ot !== null ? CryptoService::encryptAESGCM((string)$ot) : null,
        'late_penalty_per_minute_enc' => $late !== null ? CryptoService::encryptAESGCM((string)$late) : null,

        'salary_alg' => 'AES',
        'salary_key_id' => CryptoService::keyId(),
    ]);

    return response()->json([
        'salary_profile' => $profile,
    ], 201);
}

    public function update(Request $request, Employee $employee)
    {
        $user = $request->user();

        $isPrivileged = in_array($user->role, ['fat', 'director'], true);
        if (!$isPrivileged) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'employee_code' => [
                'sometimes', 'string', 'max:50',
                Rule::unique('employees', 'employee_code')->ignore($employee->id)
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'department' => ['sometimes', 'nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],

            'nik' => ['sometimes', 'nullable', 'string', 'max:32'],
            'npwp' => ['sometimes', 'nullable', 'string', 'max:32'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],

            'bank_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'bank_account_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'bank_account_number' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $employee->update($data);
                // ✅ kalau admin mengubah "name" employee, sinkron juga ke tabel users
        if (array_key_exists('name', $data) && $employee->user_id) {
            User::where('id', $employee->user_id)->update([
                'name' => $data['name'],
            ]);
        }


        return response()->json([
            'message' => 'Employee updated',
            'employee' => $employee->fresh(),
        ]);
    }

    public function destroy(Request $request, Employee $employee)
    {
        $user = $request->user();

        $isPrivileged = in_array($user->role, ['fat', 'director'], true);
        if (!$isPrivileged) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // kalau sudah pernah dipakai payroll, block
        if ($employee->payrolls()->exists()) {
            return response()->json([
                'message' => 'Employee tidak bisa dihapus karena sudah memiliki payroll.'
            ], 422);
        }

        $employee->salaryProfiles()->delete();
        $employee->delete();

        return response()->json(['message' => 'Employee deleted']);
    }
}
