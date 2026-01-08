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

    if ($isPrivileged || $isOwner) {
        $alg = strtoupper((string) ($employee->pii_alg ?? 'AES'));

        $base += [
            'nik' => CryptoService::readEncryptedOrPlain($employee->nik_enc, $employee->nik, $alg),
            'npwp' => CryptoService::readEncryptedOrPlain($employee->npwp_enc, $employee->npwp, $alg),
            'phone' => CryptoService::readEncryptedOrPlain($employee->phone_enc, $employee->phone, $alg),
            'address' => CryptoService::readEncryptedOrPlain($employee->address_enc, $employee->address, $alg),
            'bank_account_number' => CryptoService::readEncryptedOrPlain(
                $employee->bank_account_number_enc,
                $employee->bank_account_number,
                $alg
            ),
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

        $alg = strtoupper((string) ($profile->salary_alg ?? 'AES'));

        $base  = $profile->base_salary_enc ? (float) CryptoService::decryptByAlg($profile->base_salary_enc, $alg) : (float) $profile->base_salary;
        $allow = $profile->allowance_fixed_enc ? (float) CryptoService::decryptByAlg($profile->allowance_fixed_enc, $alg) : (float) $profile->allowance_fixed;
        $ded   = $profile->deduction_fixed_enc ? (float) CryptoService::decryptByAlg($profile->deduction_fixed_enc, $alg) : (float) $profile->deduction_fixed;

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

        // ✅ pilih algoritma PII (default AES)
        'pii_alg' => ['nullable', 'in:AES,RSA'],
    ]);

    $data['user_id'] = null;

    $piiAlg = strtoupper((string) ($data['pii_alg'] ?? 'AES'));

    $encPII = function (string $v) use ($piiAlg) {
        return $piiAlg === 'RSA'
            ? CryptoService::encryptRSA($v)
            : CryptoService::encryptAESGCM($v);
    };

    // isi ciphertext kalau ada isinya
    $data['nik_enc'] = !empty($data['nik']) ? $encPII((string)$data['nik']) : null;
    $data['npwp_enc'] = !empty($data['npwp']) ? $encPII((string)$data['npwp']) : null;
    $data['phone_enc'] = !empty($data['phone']) ? $encPII((string)$data['phone']) : null;
    $data['address_enc'] = !empty($data['address']) ? $encPII((string)$data['address']) : null;
    $data['bank_account_number_enc'] = !empty($data['bank_account_number']) ? $encPII((string)$data['bank_account_number']) : null;

    // metadata
    $data['pii_alg'] = $piiAlg;
    $data['pii_key_id'] = CryptoService::keyId(); // boleh tetap ini dulu

    $employee = Employee::create($data);

    // response aman: jangan kirim PII plaintext dari sini (sesuai index kamu)
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

            // ✅
            'salary_alg' => ['nullable', 'in:AES,RSA'],
        ]);

        $alg = strtoupper((string) ($data['salary_alg'] ?? 'AES'));

        $enc = function (string $v) use ($alg) {
            return $alg === 'RSA'
                ? CryptoService::encryptRSA($v)
                : CryptoService::encryptAESGCM($v);
        };

        $base  = (float) $data['base_salary'];
        $allow = (float) ($data['allowance_fixed'] ?? 0);
        $ded   = (float) ($data['deduction_fixed'] ?? 0);

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
            'base_salary_enc' => $enc((string)$base),
            'allowance_fixed_enc' => $enc((string)$allow),
            'deduction_fixed_enc' => $enc((string)$ded),
            'daily_rate_enc' => $daily !== null ? $enc((string)$daily) : null,
            'overtime_rate_per_hour_enc' => $ot !== null ? $enc((string)$ot) : null,
            'late_penalty_per_minute_enc' => $late !== null ? $enc((string)$late) : null,

            'salary_alg' => $alg,
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

        // ✅ allow switch alg saat update (opsional)
        'pii_alg' => ['sometimes', 'in:AES,RSA'],
    ]);

    $piiAlg = strtoupper((string) ($data['pii_alg'] ?? ($employee->pii_alg ?? 'AES')));

    $encPII = function (string $v) use ($piiAlg) {
        return $piiAlg === 'RSA'
            ? CryptoService::encryptRSA($v)
            : CryptoService::encryptAESGCM($v);
    };

    // encrypt hanya kalau field dikirim
    if (array_key_exists('nik', $data)) {
        $data['nik_enc'] = !empty($data['nik']) ? $encPII((string)$data['nik']) : null;
    }
    if (array_key_exists('npwp', $data)) {
        $data['npwp_enc'] = !empty($data['npwp']) ? $encPII((string)$data['npwp']) : null;
    }
    if (array_key_exists('phone', $data)) {
        $data['phone_enc'] = !empty($data['phone']) ? $encPII((string)$data['phone']) : null;
    }
    if (array_key_exists('address', $data)) {
        $data['address_enc'] = !empty($data['address']) ? $encPII((string)$data['address']) : null;
    }
    if (array_key_exists('bank_account_number', $data)) {
        $data['bank_account_number_enc'] = !empty($data['bank_account_number'])
            ? $encPII((string)$data['bank_account_number'])
            : null;
    }

    // metadata
    $data['pii_alg'] = $piiAlg;
    $data['pii_key_id'] = CryptoService::keyId();

    $employee->update($data);

    // ✅ sinkron nama ke users kalau employee sudah linked
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
