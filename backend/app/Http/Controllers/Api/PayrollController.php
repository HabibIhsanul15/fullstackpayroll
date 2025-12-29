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

        $rows = Payroll::with('user:id,name')
            ->orderByDesc('id')
            ->get()
            ->map(function ($p) use ($user) {

                $isOwner = $p->user_id === $user->id;
                $canSee = in_array($user->role, ['fat','director'], true) || $isOwner;

                return [
                    'id' => $p->id,
                    'user_id' => $p->user_id,
                    'user_name' => $p->user?->name,
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

        $user = $request->user();
        $isOwner = $payroll->user_id === $user->id;
        $canSee = in_array($user->role, ['fat','director'], true) || $isOwner;

        return response()->json([
            'id' => $payroll->id,
            'user_id' => $payroll->user_id,
            'user_name' => $payroll->user?->name,
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

}
