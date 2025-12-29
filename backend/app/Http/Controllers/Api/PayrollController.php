<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Payroll::class);

        $user = $request->user();

        $rows = Payroll::with(['user:id,name','employee:id,employee_code,name'])
            ->orderByDesc('id')
            ->get()
            ->map(function ($p) use ($user) {

                $isOwner = $p->user_id === $user->id;
                $canSee = in_array($user->role, ['fat','director'], true) || $isOwner;

                return [
                    'id' => $p->id,
                    'user_id' => $p->user_id,
                    'employee_id' => $p->employee_id,
                    'employee_code' => $p->employee?->employee_code,
                    'employee_name' => $p->employee?->name,

                    'created_by' => $p->user?->name, // opsional

                    'periode' => $p->periode->toDateString(),

                    'gaji_pokok' => $canSee ? $p->gaji_pokok : null,
                    'tunjangan'  => $canSee ? $p->tunjangan  : null,
                    'potongan'   => $canSee ? $p->potongan   : null,
                    'total'      => $canSee ? $p->total      : null,
                    'catatan'    => $canSee ? $p->catatan    : null,

                    'masked' => !$canSee,
                ];
            });

        return response()->json($rows);
    }

    public function show(Request $request, Payroll $payroll)
{
    $this->authorize('view', $payroll);

    // ✅ pastikan relasi user & employee kebaca
    $payroll->loadMissing([
        'user:id,name',
        'employee:id,employee_code,name',
    ]);

    $user = $request->user();
    $isOwner = $payroll->user_id === $user->id;
    $canSee = in_array($user->role, ['fat','director'], true) || $isOwner;

    return response()->json([
        'id' => $payroll->id,

        // ✅ ini pegawai yang digaji (yang kamu pilih di create payroll)
        'employee_id' => $payroll->employee_id,
        'employee_code' => $payroll->employee?->employee_code,
        'employee_name' => $payroll->employee?->name,

        // ✅ ini pembuat payroll (yang login) — opsional
        'created_by' => $payroll->user?->name,

        'periode' => $payroll->periode->toDateString(),

        'gaji_pokok' => $canSee ? $payroll->gaji_pokok : null,
        'tunjangan'  => $canSee ? $payroll->tunjangan  : null,
        'potongan'   => $canSee ? $payroll->potongan   : null,
        'total'      => $canSee ? $payroll->total      : null,
        'catatan'    => $canSee ? $payroll->catatan    : null,

        'masked' => !$canSee,
    ]);
}


    // ✅ ADD THIS
    public function store(Request $request)
    {
        $this->authorize('create', Payroll::class);

        $data = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'periode'     => ['required', 'date'],
            'gaji_pokok'  => ['required', 'numeric', 'min:0'],
            'tunjangan'   => ['nullable', 'numeric', 'min:0'],
            'potongan'    => ['nullable', 'numeric', 'min:0'],
            'catatan'     => ['nullable', 'string', 'max:500'],
        ]);

        $gaji = (float) $data['gaji_pokok'];
        $tunj = (float) ($data['tunjangan'] ?? 0);
        $pot  = (float) ($data['potongan'] ?? 0);

        $payroll = Payroll::create([
            'user_id'     => $request->user()->id,     // ✅ creator (user login)
            'employee_id' => $data['employee_id'],     // ✅ pegawai yang digaji
            'periode'     => $data['periode'],
            'gaji_pokok'  => $gaji,
            'tunjangan'   => $tunj,
            'potongan'    => $pot,
            'total'       => $gaji + $tunj - $pot,
            'catatan'     => $data['catatan'] ?? null,
        ]);
        return response()->json($payroll, 201);
    }

    public function update(Request $request, Payroll $payroll)
{
    $this->authorize('update', $payroll);

    $data = $request->validate([
        'periode'    => ['sometimes', 'date'],
        'gaji_pokok' => ['sometimes', 'numeric', 'min:0'],
        'tunjangan'  => ['sometimes', 'nullable', 'numeric', 'min:0'],
        'potongan'   => ['sometimes', 'nullable', 'numeric', 'min:0'],
        'catatan'    => ['sometimes', 'nullable', 'string', 'max:500'],
    ]);

    // hitung ulang total kalau ada perubahan nominal
    $gaji = array_key_exists('gaji_pokok', $data) ? (float) $data['gaji_pokok'] : (float) $payroll->gaji_pokok;
    $tunj = array_key_exists('tunjangan',  $data) ? (float) ($data['tunjangan'] ?? 0) : (float) ($payroll->tunjangan ?? 0);
    $pot  = array_key_exists('potongan',   $data) ? (float) ($data['potongan'] ?? 0) : (float) ($payroll->potongan ?? 0);

    $data['total'] = $gaji + $tunj - $pot;

    $payroll->update($data);

    return response()->json([
        'message' => 'Payroll updated',
        'data' => $payroll->fresh(),
    ]);
}

public function destroy(Payroll $payroll)
{
    $this->authorize('delete', $payroll);

    $payroll->delete();

    return response()->json([
        'message' => 'Payroll deleted',
    ]);
}
    
}
