<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Services\CryptoService;

class MeController extends Controller
{
    public function me(Request $request)
    {
        $u = $request->user();

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
        return Employee::where('user_id', $u->id)->first();
    }

    // =========================
    // STAFF EMPLOYEE PROFILE
    // =========================
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

        // ✅ decrypt kalau tersedia, fallback ke plaintext (mode transisi)
        $emp->nik = $emp->nik_enc ? CryptoService::decryptAESGCM($emp->nik_enc) : $emp->nik;
        $emp->npwp = $emp->npwp_enc ? CryptoService::decryptAESGCM($emp->npwp_enc) : $emp->npwp;

        $emp->bank_account_number = $emp->bank_account_number_enc
            ? CryptoService::decryptAESGCM($emp->bank_account_number_enc)
            : $emp->bank_account_number;

        // opsional kalau kamu ikut encrypt phone & address
        $emp->phone = $emp->phone_enc ? CryptoService::decryptAESGCM($emp->phone_enc) : $emp->phone;
        $emp->address = $emp->address_enc ? CryptoService::decryptAESGCM($emp->address_enc) : $emp->address;

        // ✅ jangan kirim ciphertext ke frontend
        unset(
            $emp->nik_enc,
            $emp->npwp_enc,
            $emp->bank_account_number_enc,
            $emp->phone_enc,
            $emp->address_enc,
            $emp->pii_alg,
            $emp->pii_key_id
        );

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

        // ✅ ENCRYPT hanya field yang memang ikut dikirim
        if (array_key_exists('nik', $data)) {
            $data['nik_enc'] = !empty($data['nik']) ? CryptoService::encryptAESGCM((string)$data['nik']) : null;
        }

        if (array_key_exists('npwp', $data)) {
            $data['npwp_enc'] = !empty($data['npwp']) ? CryptoService::encryptAESGCM((string)$data['npwp']) : null;
        }

        if (array_key_exists('bank_account_number', $data)) {
            $data['bank_account_number_enc'] = !empty($data['bank_account_number'])
                ? CryptoService::encryptAESGCM((string)$data['bank_account_number'])
                : null;
        }

        // opsional: kalau ikut encrypt phone & address
        if (array_key_exists('phone', $data)) {
            $data['phone_enc'] = !empty($data['phone']) ? CryptoService::encryptAESGCM((string)$data['phone']) : null;
        }

        if (array_key_exists('address', $data)) {
            $data['address_enc'] = !empty($data['address']) ? CryptoService::encryptAESGCM((string)$data['address']) : null;
        }

        // metadata enkripsi
        $data['pii_alg'] = 'AES';
        $data['pii_key_id'] = CryptoService::keyId();

        // ✅ baru update
        $emp->update($data);

        // sync nama user
        if (array_key_exists('name', $data)) {
            $u->update(['name' => $data['name']]);
        }

        // ✅ response: balikin plaintext yang sudah didecrypt (biar FE tampil normal)
        $fresh = $emp->fresh();

        $fresh->nik = $fresh->nik_enc ? CryptoService::decryptAESGCM($fresh->nik_enc) : $fresh->nik;
        $fresh->npwp = $fresh->npwp_enc ? CryptoService::decryptAESGCM($fresh->npwp_enc) : $fresh->npwp;

        $fresh->bank_account_number = $fresh->bank_account_number_enc
            ? CryptoService::decryptAESGCM($fresh->bank_account_number_enc)
            : $fresh->bank_account_number;

        $fresh->phone = $fresh->phone_enc ? CryptoService::decryptAESGCM($fresh->phone_enc) : $fresh->phone;
        $fresh->address = $fresh->address_enc ? CryptoService::decryptAESGCM($fresh->address_enc) : $fresh->address;

        unset(
            $fresh->nik_enc,
            $fresh->npwp_enc,
            $fresh->bank_account_number_enc,
            $fresh->phone_enc,
            $fresh->address_enc,
            $fresh->pii_alg,
            $fresh->pii_key_id
        );

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'data' => $fresh,
        ]);
    }

    // =========================
    // USER PROFILE (ALL ROLES)
    // =========================
    public function updateMe(Request $request)
    {
        $u = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $u->update([
            'name' => $data['name'],
        ]);

        return response()->json([
            'message' => 'Nama berhasil diperbarui.',
            'user' => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
            ],
        ]);
    }

    public function updatePassword(Request $request)
    {
        $u = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!Hash::check($data['current_password'], $u->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password lama tidak sesuai.'],
            ]);
        }

        $u->update([
            'password' => Hash::make($data['password']),
        ]);

        // optional: logout semua device
        // $u->tokens()->delete();

        return response()->json([
            'message' => 'Password berhasil diperbarui.',
        ]);
    }
}
