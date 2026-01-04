<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\Employee;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class PayrollController extends Controller
{
    /**
     * GET /api/payrolls
     * List payroll (nominal di-mask kalau user tidak berhak)
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Payroll::class);

        $user = $request->user();

        // Optional filter (kalau kamu mau pakai dari frontend)
        // contoh: ?employee_id=1&periode=2025-12-01
        $query = Payroll::query()->with([
            'user:id,name',
            'employee:id,user_id,employee_code,name,status',
        ])->orderByDesc('id');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('periode')) {
            // periode disimpan sebagai date -> cocok pakai whereDate
            $query->whereDate('periode', $request->periode);
        }

        $rows = $query->get()->map(function (Payroll $p) use ($user) {
            $canSeeNominal = $this->canSeeNominal($user, $p);

            return [
                'id' => $p->id,
                'user_id' => $p->user_id,
                'employee_id' => $p->employee_id,
                'employee_code' => $p->employee?->employee_code,
                'employee_name' => $p->employee?->name,
                'employee_status' => $p->employee?->status,

                'created_by' => $p->user?->name,

                'periode' => optional($p->periode)->toDateString(),

                'gaji_pokok' => $canSeeNominal ? $p->gaji_pokok : null,
                'tunjangan'  => $canSeeNominal ? $p->tunjangan  : null,
                'potongan'   => $canSeeNominal ? $p->potongan   : null,
                'total'      => $canSeeNominal ? $p->total      : null,
                'catatan'    => $canSeeNominal ? $p->catatan    : null,

                'masked' => !$canSeeNominal,
            ];
        });

        return response()->json($rows);
    }

    /**
     * GET /api/payrolls/{payroll}
     * Slip/Detail payroll per record
     */
    public function show(Request $request, Payroll $payroll)
    {
        $this->authorize('view', $payroll);

        $payroll->unsetRelation('employee');
        $payroll->unsetRelation('user');

        $payroll->load([
            'user:id,name',
            'employee:id,user_id,employee_code,name,status',
        ]);


        $user = $request->user();
        $canSeeNominal = $this->canSeeNominal($user, $payroll);

        return response()->json([
            'id' => $payroll->id,

            // pegawai yang digaji
            'employee_id' => $payroll->employee_id,
            'employee_code' => $payroll->employee?->employee_code,
            'employee_name' => $payroll->employee?->name,
            'employee_status' => $payroll->employee?->status,

            // pembuat payroll (opsional)
            'created_by' => $payroll->user?->name,

            'periode' => optional($payroll->periode)->toDateString(),

            'gaji_pokok' => $canSeeNominal ? $payroll->gaji_pokok : null,
            'tunjangan'  => $canSeeNominal ? $payroll->tunjangan  : null,
            'potongan'   => $canSeeNominal ? $payroll->potongan   : null,
            'total'      => $canSeeNominal ? $payroll->total      : null,
            'catatan'    => $canSeeNominal ? $payroll->catatan    : null,

            'masked' => !$canSeeNominal,

            // audit kecil (opsional, tapi berguna)
            'created_at' => optional($payroll->created_at)->toDateTimeString(),
            'updated_at' => optional($payroll->updated_at)->toDateTimeString(),
        ]);
    }

public function pdf(Request $request, Payroll $payroll)
{
    $this->authorize('view', $payroll);

    $payroll->unsetRelation('employee');
    $payroll->unsetRelation('user');

    $payroll->load([
        'user:id,name',
        'employee:id,user_id,employee_code,name,status',
    ]);



    $user = $request->user();

    if (!$this->canSeeNominal($user, $payroll)) {
        return response()->json([
            'message' => 'Tidak memiliki akses untuk membuka PDF slip gaji.',
        ], 403);
    }

    $pdf = Pdf::loadView('pdf.payroll-slip', [
        'payroll' => $payroll,
    ])->setPaper('A4', 'portrait');

    $filename = 'slip-gaji-' .
        ($payroll->employee?->employee_code ?? $payroll->employee_id) .
        '-' . optional($payroll->periode)->format('Y-m') . '.pdf';

    return response($pdf->output(), 200)
        ->header('Content-Type', 'application/pdf')
        ->header('Content-Disposition', 'inline; filename="'.$filename.'"');
}


    /**
     * POST /api/payrolls
     * Create payroll
     */
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

        // ✅ VALIDASI: employee harus active
        $employee = Employee::select('id', 'status')->findOrFail($data['employee_id']);
        if (($employee->status ?? null) !== 'active') {
            return response()->json([
                'message' => 'Employee inactive tidak bisa dibuat payroll.',
                'errors'  => ['employee_id' => ['Employee status inactive.']],
            ], 422);
        }

        // ✅ (Opsional tapi bagus) Cegah payroll dobel periode untuk employee yang sama
        $exists = Payroll::where('employee_id', $data['employee_id'])
            ->whereDate('periode', $data['periode'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Payroll untuk employee dan periode ini sudah ada.',
                'errors'  => ['periode' => ['Payroll periode ini sudah dibuat.']],
            ], 422);
        }

        $gaji = (float) $data['gaji_pokok'];
        $tunj = (float) ($data['tunjangan'] ?? 0);
        $pot  = (float) ($data['potongan'] ?? 0);

        $payroll = Payroll::create([
            'user_id'     => $request->user()->id, // creator
            'employee_id' => $data['employee_id'],
            'periode'     => $data['periode'],
            'gaji_pokok'  => $gaji,
            'tunjangan'   => $tunj,
            'potongan'    => $pot,
            'total'       => $gaji + $tunj - $pot,
            'catatan'     => $data['catatan'] ?? null,
        ]);

        // balikin response yang konsisten dengan show (biar frontend enak)
        $payroll->load(['user:id,name', 'employee:id,employee_code,name,status']);

        return response()->json([
            'message' => 'Payroll created',
            'data' => [
                'id' => $payroll->id,
                'employee_id' => $payroll->employee_id,
                'employee_code' => $payroll->employee?->employee_code,
                'employee_name' => $payroll->employee?->name,
                'employee_status' => $payroll->employee?->status,
                'created_by' => $payroll->user?->name,
                'periode' => optional($payroll->periode)->toDateString(),
                'gaji_pokok' => $payroll->gaji_pokok,
                'tunjangan'  => $payroll->tunjangan,
                'potongan'   => $payroll->potongan,
                'total'      => $payroll->total,
                'catatan'    => $payroll->catatan,
                'masked'     => false, // creator (finance/admin) biasanya berhak
                'created_at' => optional($payroll->created_at)->toDateTimeString(),
            ],
        ], 201);
    }

    /**
     * PUT/PATCH /api/payrolls/{payroll}
     */
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

        // (Opsional) kalau periode diubah, cegah duplikat periode untuk employee yang sama
        if (array_key_exists('periode', $data)) {
            $exists = Payroll::where('employee_id', $payroll->employee_id)
                ->whereDate('periode', $data['periode'])
                ->where('id', '!=', $payroll->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'Payroll untuk periode ini sudah ada.',
                    'errors'  => ['periode' => ['Payroll periode ini sudah dibuat.']],
                ], 422);
            }
        }

        $payroll->update($data);

        return response()->json([
            'message' => 'Payroll updated',
            'data' => $payroll->fresh()->loadMissing(['user:id,name', 'employee:id,employee_code,name,status']),
        ]);
    }

    

    /**
     * DELETE /api/payrolls/{payroll}
     */
    public function destroy(Payroll $payroll)
    {
        $this->authorize('delete', $payroll);

        $payroll->delete();

        return response()->json([
            'message' => 'Payroll deleted',
        ]);
    }

    /**
     * Nominal gaji boleh dilihat oleh:
     * - role fat / director
     * - ATAU pegawai pemilik slip (jika user punya employee_id)
     *
     * NOTE: jangan pakai "creator payroll" sebagai owner slip, itu beda konsep.
     */
private function canSeeNominal($user, Payroll $payroll): bool
{
    if (!$user) return false;

    if (in_array($user->role, ['fat', 'director'], true)) {
        return true;
    }

    // staff pemilik slip: prioritas pakai employee_id
    if (!empty($user->employee_id) && (int)$user->employee_id === (int)$payroll->employee_id) {
        return true;
    }

    // fallback: kalau user.employee_id belum sinkron, cek employee.user_id
    $emp = $payroll->employee;
    if ($emp && (int)$emp->user_id === (int)$user->id) {
        return true;
    }

    return false;
}
}