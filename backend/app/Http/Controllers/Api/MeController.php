<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function me(Request $request)
    {
        $u = $request->user();

        // optional: kasih ringkas info employee kalau ada
        $emp = Employee::where('user_id', $u->id)->first();

        return response()->json([
            'id'    => $u->id,
            'name'  => $u->name,
            'email' => $u->email,
            'role'  => $u->role,
            'employee' => $emp ? [
                'id' => $emp->id,
                'employee_code' => $emp->employee_code,
            ] : null,
        ]);
    }

    private function resolveEmployee($u): ?Employee
    {
        // ✅ relasi yang benar di DB kamu:
        // employees.user_id -> users.id
        return Employee::where('user_id', $u->id)->first();
    }

    public function employee(Request $request)
    {
        $u = $request->user();

        if ($u->role !== 'staff') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $emp = $this->resolveEmployee($u);

        if (!$emp) {
            return response()->json(['message' => 'Akun ini belum terhubung ke data employee.'], 404);
        }

        return response()->json($emp);
    }

    public function updateEmployee(Request $request)
    {
        $u = $request->user();

        if ($u->role !== 'staff') {
            return response()->json(['message' => 'Endpoint ini khusus untuk staff.'], 403);
        }

        $emp = $this->resolveEmployee($u);

        if (!$emp) {
            return response()->json(['message' => 'Akun ini belum terhubung ke data employee.'], 404);
        }

        // staff hanya boleh update data pribadi/sensitif
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],

            'nik' => ['sometimes', 'nullable', 'string', 'max:32'],
            'npwp' => ['sometimes', 'nullable', 'string', 'max:32'],

            'bank_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'bank_account_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'bank_account_number' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $emp->update($data);

        // ✅ sinkron nama user juga supaya header (user.name) ikut berubah
        if (array_key_exists('name', $data)) {
            $u->update(['name' => $data['name']]);
        }

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'data' => $emp->fresh(),
        ]);
    }
}
