<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\Employee;
use Illuminate\Http\Request;
use App\Services\CryptoService;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\AuditLog;

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

        $query = Payroll::query()->with([
            'user:id,name',
            'employee:id,user_id,employee_code,name,status',
        ])->orderByDesc('id');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('periode')) {
            $query->whereDate('periode', $request->periode);
        }

        $rows = $query->get()->map(function (Payroll $p) use ($user) {
            $canSeeNominal = $this->canSeeNominal($user, $p);

            // pakai alg dari record (penting untuk multi-algoritma nanti)
            $alg = $p->salary_alg ?? 'AES';

            // default null kalau tidak berhak
            $gaji = $tunj = $pot = $total = null;
            $cat  = null;

            if ($canSeeNominal) {
                // readEncryptedOrPlain:
                // - TRANSITION: pakai plaintext kalau ada, fallback decrypt
                // - CIPHER_ONLY: wajib decrypt
                $gaji  = CryptoService::readEncryptedOrPlainSafe($p->gaji_pokok_enc, $p->gaji_pokok, $alg);
                $tunj  = CryptoService::readEncryptedOrPlainSafe($p->tunjangan_enc,  $p->tunjangan,  $alg);
                $pot   = CryptoService::readEncryptedOrPlainSafe($p->potongan_enc,   $p->potongan,   $alg);
                $total = CryptoService::readEncryptedOrPlainSafe($p->total_enc,      $p->total,      $alg);
                $cat   = CryptoService::readEncryptedOrPlainSafe($p->catatan_enc,    $p->catatan,    $alg);


                // FE enak: nominal jadi float (catatan tetap string/null)
                $gaji  = $gaji  !== null ? (float) $gaji : null;
                $tunj  = $tunj  !== null ? (float) $tunj : null;
                $pot   = $pot   !== null ? (float) $pot  : null;
                $total = $total !== null ? (float) $total : null;
            }

            return [
                'id' => $p->id,
                'user_id' => $p->user_id,
                'employee_id' => $p->employee_id,
                'employee_code' => $p->employee?->employee_code,
                'employee_name' => $p->employee?->name,
                'employee_status' => $p->employee?->status,

                'created_by' => $p->user?->name,
                'periode' => optional($p->periode)->toDateString(),

                'gaji_pokok' => $gaji,
                'tunjangan'  => $tunj,
                'potongan'   => $pot,
                'total'      => $total,
                'catatan'    => $cat,

                'masked' => !$canSeeNominal,
            ];
        });

        return response()->json($rows);
    }


    /**
     * GET /api/payrolls/{payroll}
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
        $alg = $payroll->salary_alg ?? 'AES';

        $gaji = $tunj = $pot = $total = null;
        $cat  = null;

        if ($canSeeNominal) {
            try {
                $gaji  = CryptoService::readEncryptedOrPlain($payroll->gaji_pokok_enc, $payroll->gaji_pokok, $alg);
                $tunj  = CryptoService::readEncryptedOrPlain($payroll->tunjangan_enc,  $payroll->tunjangan,  $alg);
                $pot   = CryptoService::readEncryptedOrPlain($payroll->potongan_enc,   $payroll->potongan,   $alg);
                $total = CryptoService::readEncryptedOrPlain($payroll->total_enc,      $payroll->total,      $alg);
                $cat   = CryptoService::readEncryptedOrPlain($payroll->catatan_enc,    $payroll->catatan,    $alg);

                // FE enak: nominal jadi float (catatan tetap string/null)
                $gaji  = $gaji  !== null ? (float) $gaji : null;
                $tunj  = $tunj  !== null ? (float) $tunj : null;
                $pot   = $pot   !== null ? (float) $pot  : null;
                $total = $total !== null ? (float) $total : null;
            } catch (\Throwable $e) {
                // Optional: log internal (tidak bocorkan ke user)
                // logger()->warning('PAYROLL_DETAIL_DECRYPT_FAILED', [
                //     'payroll_id' => $payroll->id,
                //     'alg' => $alg,
                //     'err' => $e->getMessage(),
                // ]);

                return response()->json([
                    'message' => 'Data payroll tidak dapat diproses. Hubungi admin.',
                ], 422);
            }
        }

        // audit untuk view detail (aman karena tidak menyimpan nominal)
        $this->audit($request, 'PAYROLL_VIEW_DETAIL', $payroll);

        return response()->json([
            'id' => $payroll->id,

            'employee_id' => $payroll->employee_id,
            'employee_code' => $payroll->employee?->employee_code,
            'employee_name' => $payroll->employee?->name,
            'employee_status' => $payroll->employee?->status,

            'created_by' => $payroll->user?->name,
            'periode' => optional($payroll->periode)->toDateString(),

            'gaji_pokok' => $gaji,
            'tunjangan'  => $tunj,
            'potongan'   => $pot,
            'total'      => $total,
            'catatan'    => $cat,

            'masked' => !$canSeeNominal,

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

        $alg = $payroll->salary_alg ?? 'AES';

        // decrypt values yang akan dipakai blade
        try {
            $payroll->gaji_pokok = CryptoService::readEncryptedOrPlain($payroll->gaji_pokok_enc, $payroll->gaji_pokok, $alg);
            $payroll->tunjangan  = CryptoService::readEncryptedOrPlain($payroll->tunjangan_enc,  $payroll->tunjangan,  $alg);
            $payroll->potongan   = CryptoService::readEncryptedOrPlain($payroll->potongan_enc,   $payroll->potongan,   $alg);
            $payroll->total      = CryptoService::readEncryptedOrPlain($payroll->total_enc,      $payroll->total,      $alg);
            $payroll->catatan    = CryptoService::readEncryptedOrPlain($payroll->catatan_enc,    $payroll->catatan,    $alg);
        } catch (\Throwable $e) {
            // Optional: log internal
            // logger()->warning('PAYROLL_PDF_DECRYPT_FAILED', [
            //     'payroll_id' => $payroll->id,
            //     'alg' => $alg,
            //     'err' => $e->getMessage(),
            // ]);

            return response()->json([
                'message' => 'Slip gaji tidak dapat diproses. Hubungi admin.',
            ], 422);
        }

        // Cast nominal jadi float supaya rupiah() di blade aman
        $payroll->gaji_pokok = $payroll->gaji_pokok !== null ? (float) $payroll->gaji_pokok : 0;
        $payroll->tunjangan  = $payroll->tunjangan  !== null ? (float) $payroll->tunjangan  : 0;
        $payroll->potongan   = $payroll->potongan   !== null ? (float) $payroll->potongan   : 0;

        // kalau total null, hitung ulang untuk safety
        $payroll->total = $payroll->total !== null
            ? (float) $payroll->total
            : ($payroll->gaji_pokok + $payroll->tunjangan - $payroll->potongan);

        $pdf = Pdf::loadView('pdf.payroll-slip', [
            'payroll' => $payroll,
        ])->setPaper('A4', 'portrait');

        $filename = 'slip-gaji-' .
            ($payroll->employee?->employee_code ?? $payroll->employee_id) .
            '-' . optional($payroll->periode)->format('Y-m') . '.pdf';

        $this->audit($request, 'PAYROLL_VIEW_PDF', $payroll);

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

        // ✅ Cegah payroll dobel periode untuk employee yang sama
        $exists = Payroll::where('employee_id', $data['employee_id'])
            ->whereDate('periode', $data['periode'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Payroll untuk employee dan periode ini sudah ada.',
                'errors'  => ['periode' => ['Payroll periode ini sudah dibuat.']],
            ], 422);
        }

        // ===========================
        // 1) Hitung nominal
        // ===========================
        $gaji  = (float) $data['gaji_pokok'];
        $tunj  = (float) ($data['tunjangan'] ?? 0);
        $pot   = (float) ($data['potongan'] ?? 0);
        $total = $gaji + $tunj - $pot;

        // ===========================
        // 2) Simpan PLAINTEXT + CIPHERTEXT
        // ===========================
        $payroll = Payroll::create([
            'user_id'     => $request->user()->id, // creator
            'employee_id' => $data['employee_id'],
            'periode'     => $data['periode'],

            // plaintext (mode transisi, biar sistem tetap jalan)
            'gaji_pokok'  => $gaji,
            'tunjangan'   => $tunj,
            'potongan'    => $pot,
            'total'       => $total,
            'catatan'     => $data['catatan'] ?? null,

            // ciphertext (hasil enkripsi untuk TA & keamanan DB)
            'gaji_pokok_enc' => CryptoService::encryptAESGCM((string) $gaji),
            'tunjangan_enc'  => CryptoService::encryptAESGCM((string) $tunj),
            'potongan_enc'   => CryptoService::encryptAESGCM((string) $pot),
            'total_enc'      => CryptoService::encryptAESGCM((string) $total),
            'catatan_enc'    => !empty($data['catatan'])
                ? CryptoService::encryptAESGCM((string) $data['catatan'])
                : null,

            // metadata
            'salary_alg'    => 'AES',
            'salary_key_id' => CryptoService::keyId(),
        ]);

        $this->audit(
            $request,
            'PAYROLL_CREATE',
            $payroll,
            [
                'employee_id' => $payroll->employee_id,
                'periode' => $payroll->periode,
                'alg' => $payroll->salary_alg,
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

                // response tetap plaintext (role yang create biasanya FAT/Direktur)
                'gaji_pokok' => $payroll->gaji_pokok,
                'tunjangan'  => $payroll->tunjangan,
                'potongan'   => $payroll->potongan,
                'total'      => $payroll->total,
                'catatan'    => $payroll->catatan,

                'masked'     => false,
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

        // ===========================
        // 1) Hitung ulang total
        // ===========================
        $gaji = array_key_exists('gaji_pokok', $data)
            ? (float) $data['gaji_pokok']
            : (float) $payroll->gaji_pokok;

        $tunj = array_key_exists('tunjangan', $data)
            ? (float) ($data['tunjangan'] ?? 0)
            : (float) ($payroll->tunjangan ?? 0);

        $pot = array_key_exists('potongan', $data)
            ? (float) ($data['potongan'] ?? 0)
            : (float) ($payroll->potongan ?? 0);

        $total = $gaji + $tunj - $pot;
        $data['total'] = $total;

        // ===========================
        // 2) Cegah duplikat periode
        // ===========================
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

        // ===========================
        // 3) Update ciphertext
        // ===========================
        $data['gaji_pokok_enc'] = CryptoService::encryptAESGCM((string) $gaji);
        $data['tunjangan_enc']  = CryptoService::encryptAESGCM((string) $tunj);
        $data['potongan_enc']   = CryptoService::encryptAESGCM((string) $pot);
        $data['total_enc']      = CryptoService::encryptAESGCM((string) $total);

        if (array_key_exists('catatan', $data)) {
            $data['catatan_enc'] = !empty($data['catatan'])
                ? CryptoService::encryptAESGCM((string) $data['catatan'])
                : null;
        }

        $data['salary_alg']    = 'AES';
        $data['salary_key_id'] = CryptoService::keyId();

        // ===========================
        // 4) Simpan update
        // ===========================
        $payroll->update($data);

        // ===========================
        // 5) AUDIT LOG (DI SINI)
        // ===========================
        $this->audit(
            $request,
            'payroll.update',
            $payroll,
            [
                'fields_updated' => array_keys($data),
                'employee_id'    => $payroll->employee_id,
                'periode'        => optional($payroll->periode)->toDateString(),
            ]
        );

        return response()->json([
            'message' => 'Payroll updated',
            'data' => $payroll->fresh()->loadMissing([
                'user:id,name',
                'employee:id,employee_code,name,status'
            ]),
        ]);
    }

    /**
     * DELETE /api/payrolls/{payroll}
     */
    public function destroy(Payroll $payroll)
    {
        $this->authorize('delete', $payroll);

        $payroll->delete();

        $this->audit(
            request(),
            'PAYROLL_DELETE',
            $payroll);

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

    private function audit(Request $request, string $action, ?Payroll $payroll = null, array $meta = []): void
    {
        try {
            $u = $request->user();

            AuditLog::create([
                'user_id' => $u?->id,
                'action' => $action,
                'payroll_id' => $payroll?->id,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 1000),
                'meta' => $meta,
            ]);
        } catch (\Throwable $e) {
            // Jangan ganggu flow utama kalau log gagal
            // Optional: logger()->warning('Audit log failed', ['err' => $e->getMessage()]);
        }
    }
}