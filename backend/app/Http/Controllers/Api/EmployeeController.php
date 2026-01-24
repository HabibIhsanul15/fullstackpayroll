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
    private function roleOf($user): string
    {
        return strtolower((string) ($user->role ?? ''));
    }

    private function forbid(string $msg = 'Forbidden')
    {
        return response()->json(['message' => $msg], 403);
    }

    private function inRoles($user, array $roles): bool
    {
        $r = $this->roleOf($user);
        $roles = array_map(fn ($x) => strtolower((string) $x), $roles);
        return in_array($r, $roles, true);
    }

    public function index(Request $request)
    {
        $user = $request->user();

        // HCGA/FAT/DIRECTOR boleh lihat list
        if (!$this->inRoles($user, ['hcga', 'fat', 'director'])) {
            return $this->forbid();
        }

        // ===== query params =====
        $q       = trim((string) $request->query('q', ''));
        $status  = strtolower((string) $request->query('status', 'all'));
        $sortBy  = (string) $request->query('sort_by', 'name');
        $sortDir = strtolower((string) $request->query('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';

        // filter salary profile (optional)
        // has_salary_profile = 1 / 0 / true / false (string)
        $hasSalaryRaw = $request->query('has_salary_profile', null);
        // date untuk menentukan salary profile yang "aktif" (minimal effective_from <= date)
        $date = $request->query('date', null); // contoh: 2026-01-01

        // ===== whitelist sort (AMAN) =====
        $allowedSort = ['employee_code', 'name', 'department', 'position', 'status', 'created_at'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'name';
        }

        $query = Employee::query();

        // ===== add flag: has_salary_profile (berdasarkan date jika dikirim) =====
        $query->withExists([
            'salaryProfiles as has_salary_profile' => function ($sp) use ($date) {
                if ($date) {
                    $sp->whereDate('effective_from', '<=', $date);
                }
            }
        ]);

        // ===== SEARCH =====
        if ($q !== '') {
            $query->where(function ($w) use ($q) {
                $w->where('employee_code', 'like', "%{$q}%")
                    ->orWhere('name', 'like', "%{$q}%")
                    ->orWhere('department', 'like', "%{$q}%")
                    ->orWhere('position', 'like', "%{$q}%");
            });
        }

        // ===== FILTER STATUS =====
        if ($status !== 'all' && $status !== '') {
            $query->where('status', $status);
        }

        // ===== FILTER has_salary_profile (optional) =====
        if ($hasSalaryRaw !== null && $hasSalaryRaw !== '') {
            $bool = filter_var($hasSalaryRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($bool === null) $bool = ((string)$hasSalaryRaw === '1'); // fallback

            if ($bool) {
                $query->whereHas('salaryProfiles', function ($sp) use ($date) {
                    if ($date) {
                        $sp->whereDate('effective_from', '<=', $date);
                    }
                });
            } else {
                // "yang belum punya salary"
                if ($date) {
                    // belum punya salary berlaku sampai date tsb
                    $query->whereDoesntHave('salaryProfiles', function ($sp) use ($date) {
                        $sp->whereDate('effective_from', '<=', $date);
                    });
                } else {
                    $query->whereDoesntHave('salaryProfiles');
                }
            }
        }

        // ===== SORT =====
        $query->orderBy($sortBy, $sortDir);

        return $query->get([
            'id',
            'employee_code',
            'name',
            'department',
            'position',
            'status',
            'user_id',
            // kolom has_salary_profile akan ikut kebawa dari withExists
        ]);
    }

    public function nextCode(Request $request)
    {
        $user = $request->user();

        // hanya HCGA
        if (!$this->inRoles($user, ['hcga'])) {
            return $this->forbid();
        }

        $last = Employee::whereNotNull('employee_code')
            ->where('employee_code', 'like', 'EMP-%')
            ->orderByDesc('id')
            ->value('employee_code');

        $nextNumber = 1;
        if ($last && preg_match('/EMP-(\d{1,})$/', $last, $m)) {
            $nextNumber = ((int) $m[1]) + 1;
        }

        $nextCode = 'EMP-' . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'next_employee_code' => $nextCode,
        ]);
    }

    public function show(Request $request, Employee $employee)
    {
        $user = $request->user();
        $role = $this->roleOf($user);

        $isOwner = $employee->user_id && (int) $employee->user_id === (int) $user->id;

        // akses dasar:
        // - HCGA/FAT/DIRECTOR boleh lihat employee mana pun
        // - STAFF hanya boleh lihat dirinya sendiri
        if (!in_array($role, ['hcga', 'fat', 'director'], true)) {
            if (!($role === 'staff' && $isOwner)) {
                return $this->forbid();
            }
        }

        // field base (aman)
        $base = [
            'id' => $employee->id,
            'employee_code' => $employee->employee_code,
            'name' => $employee->name,
            'department' => $employee->department,
            'position' => $employee->position,
            'status' => $employee->status,
            'user_id' => $employee->user_id,
        ];

        $alg = strtoupper((string) ($employee->pii_alg ?? 'AES'));

        // aturan lihat PII vs Bank
        $canSeePII  = ($role === 'hcga') || $isOwner; // NIK/NPWP/Phone/Address
        $canSeeBank = in_array($role, ['hcga', 'fat'], true) || $isOwner; // bank utk transfer

        if ($canSeePII) {
            $base += [
                'nik' => CryptoService::readEncryptedOrPlain($employee->nik_enc, $employee->nik, $alg),
                'npwp' => CryptoService::readEncryptedOrPlain($employee->npwp_enc, $employee->npwp, $alg),
                'phone' => CryptoService::readEncryptedOrPlain($employee->phone_enc, $employee->phone, $alg),
                'address' => CryptoService::readEncryptedOrPlain($employee->address_enc, $employee->address, $alg),
            ];
        }

        if ($canSeeBank) {
            $base += [
                'bank_name' => $employee->bank_name,
                'bank_account_name' => $employee->bank_account_name,
                'bank_account_number' => CryptoService::readEncryptedOrPlain(
                    $employee->bank_account_number_enc,
                    $employee->bank_account_number,
                    $alg
                ),
            ];
        }

        // ====== tambahin ACCOUNT INFO (emp.user) ======
        // Aturan aman:
        // - HCGA: boleh lihat user detail (id,name,email,role)
        // - OWNER: boleh lihat user detail miliknya sendiri
        // - FAT/DIRECTOR: tidak perlu email, jadi tidak dikirim
        if ($employee->user_id && ($role === 'hcga' || $isOwner)) {
            $u = User::query()
                ->select(['id', 'name', 'email', 'role'])
                ->find($employee->user_id);

            $base['user'] = $u ? [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
            ] : null;
        } else {
            // biar frontend bisa tahu "punya akun atau tidak" tanpa bocorin email
            $base['user'] = $employee->user_id ? [
                'id' => (int) $employee->user_id,
            ] : null;
        }

        // masked kalau sama sekali gak dapat info sensitif
        if (!$canSeePII && !$canSeeBank) {
            $base['masked'] = true;
        }

        return response()->json($base);
    }

    public function createUser(Request $request, Employee $employee)
    {
        $actor = $request->user();

        // hanya HCGA bikin akun
        if (!$this->inRoles($actor, ['hcga'])) {
            return $this->forbid();
        }

        if ($employee->user_id) {
            return response()->json(['message' => 'Employee ini sudah punya akun.'], 422);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::in(['staff', 'hcga'])],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => Hash::make($data['password']),
        ]);

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
        $user = $request->user();
        $role = $this->roleOf($user);

        // lihat salary profile: HCGA/FAT/DIRECTOR
        if (!in_array($role, ['hcga', 'fat', 'director'], true)) {
            return $this->forbid();
        }

        $date = $request->query('date', now()->toDateString());
        $profile = $employee->currentSalaryProfile($date);

        if (!$profile) {
            return response()->json(['message' => 'Salary profile not found'], 404);
        }

        $alg = strtoupper((string) ($profile->salary_alg ?? 'AES'));
        if (!in_array($alg, ['AES', 'RSA', 'HYBRID'], true)) {
            $alg = 'AES';
        }

        // decrypt jika enc ada, fallback ke plaintext
        $base = $profile->base_salary_enc
            ? (float) CryptoService::decryptSalaryValue($profile->base_salary_enc, $alg, $profile->salary_key_id)
            : (float) $profile->base_salary;

        $allow = $profile->allowance_fixed_enc
            ? (float) CryptoService::decryptSalaryValue($profile->allowance_fixed_enc, $alg, $profile->salary_key_id)
            : (float) $profile->allowance_fixed;

        $ded = $profile->deduction_fixed_enc
            ? (float) CryptoService::decryptSalaryValue($profile->deduction_fixed_enc, $alg, $profile->salary_key_id)
            : (float) $profile->deduction_fixed;

        return response()->json([
            'employee_id' => $employee->id,
            'effective_from' => optional($profile->effective_from)->toDateString(),
            'base_salary' => (string) $base,
            'allowance_fixed' => (string) $allow,
            'deduction_fixed' => (string) $ded,
            'suggested_total' => (string) ($base + $allow - $ded),

            // metadata (buat TA / debugging)
            'salary_alg' => $alg,
            'salary_key_id' => $profile->salary_key_id,
        ]);
    }

        public function store(Request $request)
        {
            $user = $request->user();

            // create employee: hanya HCGA
            if (!$this->inRoles($user, ['hcga'])) {
                return $this->forbid();
            }

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

                'pii_alg' => ['nullable', 'in:AES,RSA'],
            ]);

            $data['user_id'] = null;

            $piiAlg = strtoupper((string) ($data['pii_alg'] ?? 'AES'));

            $encPII = function (string $v) use ($piiAlg) {
                return $piiAlg === 'RSA'
                    ? CryptoService::encryptRSA($v)
                    : CryptoService::encryptAESGCM($v);
            };

            $data['nik_enc'] = !empty($data['nik']) ? $encPII((string) $data['nik']) : null;
            $data['npwp_enc'] = !empty($data['npwp']) ? $encPII((string) $data['npwp']) : null;
            $data['phone_enc'] = !empty($data['phone']) ? $encPII((string) $data['phone']) : null;
            $data['address_enc'] = !empty($data['address']) ? $encPII((string) $data['address']) : null;
            $data['bank_account_number_enc'] = !empty($data['bank_account_number']) ? $encPII((string) $data['bank_account_number']) : null;

            $data['pii_alg'] = $piiAlg;
            $data['pii_key_id'] = CryptoService::keyId();

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
    $user = $request->user();
    if (!$this->inRoles($user, ['hcga'])) return $this->forbid();

    $data = $request->validate([
        'base_salary' => ['required', 'numeric', 'min:0'],
        'allowance_fixed' => ['nullable', 'numeric', 'min:0'],
        'deduction_fixed' => ['nullable', 'numeric', 'min:0'],
        'effective_from' => ['required', 'date'],
        'salary_alg' => ['nullable', 'in:AES,RSA,HYBRID'],
    ]);

    $alg = strtoupper((string)($data['salary_alg'] ?? 'AES'));
    if (!in_array($alg, ['AES','RSA','HYBRID'], true)) $alg = 'AES';

    $base  = (float) $data['base_salary'];
    $allow = (float) ($data['allowance_fixed'] ?? 0);
    $ded   = (float) ($data['deduction_fixed'] ?? 0);

    // cari profile untuk effective_from ini (atau current profile pada tanggal itu)
    $effective = $data['effective_from'];
    $existing = $employee->salaryProfiles()
        ->whereDate('effective_from', '=', $effective)
        ->first();

    $salaryKeyId = $existing?->salary_key_id; // kalau HYBRID dan mau pakai key lama
    [$baseEnc,  $salaryKeyId, $algNorm] = CryptoService::encryptSalaryValue((string)$base,  $alg, $salaryKeyId);
    [$allowEnc, $salaryKeyId, $algNorm] = CryptoService::encryptSalaryValue((string)$allow, $alg, $salaryKeyId);
    [$dedEnc,   $salaryKeyId, $algNorm] = CryptoService::encryptSalaryValue((string)$ded,   $alg, $salaryKeyId);

    $payload = [
        'base_salary' => $base,
        'allowance_fixed' => $allow,
        'deduction_fixed' => $ded,
        'effective_from' => $effective,

        'base_salary_enc' => $baseEnc,
        'allowance_fixed_enc' => $allowEnc,
        'deduction_fixed_enc' => $dedEnc,

        'salary_alg' => $algNorm,
        'salary_key_id' => $salaryKeyId,
    ];

    if ($existing) {
        $existing->update($payload);
        $profile = $existing->fresh();
        $status = 200;
    } else {
        $profile = $employee->salaryProfiles()->create($payload);
        $status = 201;
    }

    return response()->json(['salary_profile' => $profile], $status);
}

    public function update(Request $request, Employee $employee)
    {
        $user = $request->user();

        // update employee: hanya HCGA
        if (!$this->inRoles($user, ['hcga'])) {
            return $this->forbid();
        }

        // NOTE: employee_code sengaja TIDAK BOLEH diupdate (read-only)
        $data = $request->validate([
            'employee_code' => ['sometimes'], // <- diterima biar validator gak error kalau kekirim, tapi nanti kita buang
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

            'pii_alg' => ['sometimes', 'in:AES,RSA'],
        ]);

        // ✅ HARD BLOCK: jangan pernah update employee_code
        unset($data['employee_code']);

        $piiAlg = strtoupper((string) ($data['pii_alg'] ?? ($employee->pii_alg ?? 'AES')));

        $encPII = function (string $v) use ($piiAlg) {
            return $piiAlg === 'RSA'
                ? CryptoService::encryptRSA($v)
                : CryptoService::encryptAESGCM($v);
        };

        if (array_key_exists('nik', $data)) {
            $data['nik_enc'] = !empty($data['nik']) ? $encPII((string) $data['nik']) : null;
        }
        if (array_key_exists('npwp', $data)) {
            $data['npwp_enc'] = !empty($data['npwp']) ? $encPII((string) $data['npwp']) : null;
        }
        if (array_key_exists('phone', $data)) {
            $data['phone_enc'] = !empty($data['phone']) ? $encPII((string) $data['phone']) : null;
        }
        if (array_key_exists('address', $data)) {
            $data['address_enc'] = !empty($data['address']) ? $encPII((string) $data['address']) : null;
        }
        if (array_key_exists('bank_account_number', $data)) {
            $data['bank_account_number_enc'] = !empty($data['bank_account_number'])
                ? $encPII((string) $data['bank_account_number'])
                : null;
        }

        $data['pii_alg'] = $piiAlg;
        $data['pii_key_id'] = CryptoService::keyId();

        $employee->update($data);

        // sinkron nama user kalau employee punya akun
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

        // delete employee: hanya HCGA
        if (!$this->inRoles($user, ['hcga'])) {
            return $this->forbid();
        }

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
