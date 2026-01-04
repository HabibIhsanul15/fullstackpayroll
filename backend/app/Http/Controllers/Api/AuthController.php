<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * POST /api/login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Email atau password salah.'], 401);
        }

        $user = $request->user();

        // optional: bersihin token lama
        $user->tokens()->delete();

        $token = $user->createToken('payroll')->plainTextToken;

        // ambil employee via employees.user_id (karena users.employee_id TIDAK ADA di DB kamu)
        $emp = Employee::where('user_id', $user->id)->first();

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->role,
                // ✅ frontend-safe: kasih info employee kalau ada
                'employee' => $emp ? [
                    'id' => $emp->id,
                    'employee_code' => $emp->employee_code,
                ] : null,
            ],
        ]);
    }

    /**
     * POST /api/logout (auth:sanctum)
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Logged out']);
    }

    /**
     * POST /api/register
     * Register STAFF only:
     * - role dipaksa "staff"
     * - create employee dan link via employees.user_id
     */
    public function registerStaff(Request $request)
    {
        $data = $request->validate([
            // Step 1 (wajib)
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],

            // Step 2 (wajib)
            'department' => ['required', 'string', 'max:255'],
            'position' => ['required', 'string', 'max:255'],

            // Step 3 (opsional)
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($data) {

            // 1) create user
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                // ✅ model kamu sudah casts password => hashed, jadi langsung set plain
                'password' => $data['password'],
                'role' => 'staff',
            ]);

            // 2) create employee (relasi utama via employees.user_id)
            $employee = Employee::create([
                'user_id' => $user->id,
                'employee_code' => $this->generateEmployeeCodeSafe(),
                'name' => $user->name,
                'department' => $data['department'],
                'position' => $data['position'],
                'address' => $data['address'] ?? null,
                'status' => 'active',
            ]);

            return response()->json([
                'message' => 'Register staff berhasil. Silakan login.',
                'data' => [
                    'user_id' => $user->id,
                    'employee_id' => $employee->id,            // ✅ info saja
                    'employee_code' => $employee->employee_code,
                ],
            ], 201);
        });
    }

    /**
     * Generate employee_code aman (hindari tabrakan saat register barengan).
     * Format: EMP-0001
     */
    private function generateEmployeeCodeSafe(): string
    {
        $last = DB::table('employees')
            ->select('employee_code')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $lastCode = $last?->employee_code ?? '';
        $lastNum = 0;

        if ($lastCode && preg_match('/(\d+)/', $lastCode, $m)) {
            $lastNum = (int) $m[1];
        }

        $next = $lastNum + 1;

        return 'EMP-' . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
