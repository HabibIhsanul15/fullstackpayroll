<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\Employee;
use Illuminate\Http\Request;
use App\Services\CryptoService;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\AuditLog;
use Carbon\Carbon;
use App\Models\PerfLog;

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

        $t0_total = hrtime(true);

        // Reset relation + load (bagian DB)
        $payroll->unsetRelation('employee');
        $payroll->unsetRelation('user');

        $t0_db = hrtime(true);

        $payroll->load([
            'user:id,name',
            'employee:id,user_id,employee_code,name,status',
        ]);

        $db_ms = (hrtime(true) - $t0_db) / 1e6;

        $user = $request->user();
        $canSeeNominal = $this->canSeeNominal($user, $payroll);
        $alg = $payroll->salary_alg ?? 'AES';

        $gaji = $tunj = $pot = $total = null;
        $cat  = null;

        $dec_ms = null;

        if ($canSeeNominal) {
            $t0_dec = hrtime(true);

            try {
                $gaji  = CryptoService::readEncryptedOrPlain($payroll->gaji_pokok_enc, $payroll->gaji_pokok, $alg);
                $tunj  = CryptoService::readEncryptedOrPlain($payroll->tunjangan_enc,  $payroll->tunjangan,  $alg);
                $pot   = CryptoService::readEncryptedOrPlain($payroll->potongan_enc,   $payroll->potongan,   $alg);
                $total = CryptoService::readEncryptedOrPlain($payroll->total_enc,      $payroll->total,      $alg);
                $cat   = CryptoService::readEncryptedOrPlain($payroll->catatan_enc,    $payroll->catatan,    $alg);

                // nominal jadi float
                $gaji  = $gaji  !== null ? (float) $gaji : null;
                $tunj  = $tunj  !== null ? (float) $tunj : null;
                $pot   = $pot   !== null ? (float) $pot  : null;
                $total = $total !== null ? (float) $total : null;

                $dec_ms = (hrtime(true) - $t0_dec) / 1e6;
            } catch (\Throwable $e) {
                // Catat perf log failure (optional)
                $total_ms_fail = (hrtime(true) - $t0_total) / 1e6;

                try {
                    PerfLog::create([
                        'scenario' => 'READ_DETAIL',
                        'alg' => strtoupper((string) $alg),
                        'payroll_id' => $payroll->id,
                        'decrypt_ms' => null,
                        'db_ms' => $db_ms,
                        'total_ms' => $total_ms_fail,
                        'meta' => [
                            'masked' => false,
                            'decrypt_error' => 'DECRYPT_FAILED',
                        ],
                    ]);
                } catch (\Throwable $e2) {
                    // ignore
                }

                return response()->json([
                    'message' => 'Data payroll tidak dapat diproses. Hubungi admin.',
                ], 422);
            }
        }

        // audit view detail
        $this->audit($request, 'PAYROLL_VIEW_DETAIL', $payroll);

        $total_ms = (hrtime(true) - $t0_total) / 1e6;

        // simpan perf log (kalau tidak berhak lihat nominal, decrypt_ms null)
        try {
            PerfLog::create([
                'scenario' => 'READ_DETAIL',
                'alg' => strtoupper((string) $alg),
                'payroll_id' => $payroll->id,
                'decrypt_ms' => $dec_ms,
                'db_ms' => $db_ms,
                'total_ms' => $total_ms,
                'meta' => [
                    'masked' => !$canSeeNominal,
                ],
            ]);
        } catch (\Throwable $e) {
            // ignore
        }

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

    // ===== total timer (seluruh proses backend store) =====
    $t0_total = hrtime(true);

    $data = $request->validate([
        'employee_id' => ['required', 'exists:employees,id'],
        'periode'     => ['required', 'date'],
        'gaji_pokok'  => ['required', 'numeric', 'min:0'],
        'tunjangan'   => ['nullable', 'numeric', 'min:0'],
        'potongan'    => ['nullable', 'numeric', 'min:0'],
        'catatan'     => ['nullable', 'string', 'max:500'],
    ]);
        // ✅ paksa periode jadi awal bulan (YYYY-MM-01)
    $periode = Carbon::parse($data['periode'])->startOfMonth();
    $data['periode'] = $periode->toDateString();


    // ===== validasi status employee =====
    $employee = Employee::select('id','status')->findOrFail($data['employee_id']);
    if (($employee->status ?? null) !== 'active') {
        return response()->json([
            'message' => 'Employee inactive tidak bisa dibuat payroll.',
            'errors'  => ['employee_id' => ['Employee status inactive.']],
        ], 422);
    }

    // ===== cek duplikat periode =====
    $exists = Payroll::where('employee_id', $data['employee_id'])
        ->whereYear('periode', $periode->year)
        ->whereMonth('periode', $periode->month)
        ->exists();

    if ($exists) {
        return response()->json([
            'message' => 'Payroll untuk employee dan periode ini sudah ada.',
            'errors'  => ['periode' => ['Payroll periode ini sudah dibuat.']],
        ], 422);
    }

    // ===== hitung nominal =====
    $gaji  = (float) $data['gaji_pokok'];
    $tunj  = (float) ($data['tunjangan'] ?? 0);
    $pot   = (float) ($data['potongan'] ?? 0);
    $total = $gaji + $tunj - $pot;

    // ===== algoritma dari ENV =====
    $alg = CryptoService::writeAlg();

    $enc = function (string $v) use ($alg) {
        return match ($alg) {
            'RSA'    => CryptoService::encryptRSA($v),
            'HYBRID' => CryptoService::encryptHybrid($v),
            default  => CryptoService::encryptAESGCM($v),
        };
    };

    // salary_key_id buat audit/rotasi/pembanding TA
    $keyId = match ($alg) {
        'RSA'    => CryptoService::rsaKeyId(),
        'HYBRID' => CryptoService::rsaKeyId(), // hybrid pakai RSA key id untuk wrapping
        default  => CryptoService::keyId(),
    };

    // ===== encrypt timer (hanya proses encrypt field) =====
    $t0_enc = hrtime(true);

    $gaji_enc  = $enc((string) $gaji);
    $tunj_enc  = $enc((string) $tunj);
    $pot_enc   = $enc((string) $pot);
    $total_enc = $enc((string) $total);
    $cat_enc   = !empty($data['catatan']) ? $enc((string) $data['catatan']) : null;

    $enc_ms = (hrtime(true) - $t0_enc) / 1e6;

    // ===== DB timer (hanya create/insert payroll) =====
    $t0_db = hrtime(true);

    $payroll = Payroll::create([
        'user_id'     => $request->user()->id,
        'employee_id' => $data['employee_id'],
        'periode'     => $data['periode'],

        // plaintext null (CIPHER_ONLY)
        'gaji_pokok' => null,
        'tunjangan'  => null,
        'potongan'   => null,
        'total'      => null,
        'catatan'    => null,

        // ciphertext
        'gaji_pokok_enc' => $gaji_enc,
        'tunjangan_enc'  => $tunj_enc,
        'potongan_enc'   => $pot_enc,
        'total_enc'      => $total_enc,
        'catatan_enc'    => $cat_enc,

        'salary_alg'    => $alg,
        'salary_key_id' => $keyId,
    ]);

    $db_ms = (hrtime(true) - $t0_db) / 1e6;

    // ===== audit (punyamu) =====
    $this->audit($request, 'PAYROLL_CREATE', $payroll, [
        'employee_id' => $payroll->employee_id,
        'periode'     => $payroll->periode,
        'alg'         => $payroll->salary_alg,
        'key_id'      => $payroll->salary_key_id,
    ]);

    // ===== total time =====
    $total_ms = (hrtime(true) - $t0_total) / 1e6;

    // ===== simpan perf log (jangan ganggu flow kalau error) =====
    try {
        PerfLog::create([
            'scenario' => 'CREATE',
            'alg' => $alg,
            'payroll_id' => $payroll->id,
            'encrypt_ms' => $enc_ms,
            'db_ms' => $db_ms,
            'total_ms' => $total_ms,
            'meta' => [
                'read_mode' => env('PAYROLL_READ_MODE'),
                'storage_mode' => env('SALARY_STORAGE_MODE'),
                'cat_len' => isset($data['catatan']) ? strlen((string) $data['catatan']) : 0,
            ],
        ]);
    } catch (\Throwable $e) {
        // optional: logger()->warning('PERFLOG_CREATE_FAILED', ['err' => $e->getMessage()]);
    }

    $payroll->load(['user:id,name','employee:id,employee_code,name,status']);

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
            'masked' => false,
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
        // ✅ tidak terima salary_alg dari FE
    ]);

    // 1) Algoritma target dari ENV
    $alg = strtoupper((string) env('PAYROLL_WRITE_ALG', ($payroll->salary_alg ?? 'AES')));

    $enc = function (string $v) use ($alg) {
        return match ($alg) {
            'RSA'    => CryptoService::encryptRSA($v),
            'HYBRID' => CryptoService::encryptHybrid($v),
            default  => CryptoService::encryptAESGCM($v),
        };
    };

    // ✅ salary_key_id ditentukan DI SINI
    $keyId = match ($alg) {
        'RSA'    => CryptoService::rsaKeyId(),
        'HYBRID' => CryptoService::rsaKeyId(),
        default  => CryptoService::keyId(),
    };

    // 2) Ambil nilai lama (cipher-only => decrypt dari *_enc)
    $oldAlg = strtoupper((string) ($payroll->salary_alg ?? 'AES'));

    $oldGaji = (float) CryptoService::readEncryptedOrPlainSafe($payroll->gaji_pokok_enc, null, $oldAlg);
    $oldTunj = (float) CryptoService::readEncryptedOrPlainSafe($payroll->tunjangan_enc,  null, $oldAlg);
    $oldPot  = (float) CryptoService::readEncryptedOrPlainSafe($payroll->potongan_enc,   null, $oldAlg);

    $gaji = array_key_exists('gaji_pokok', $data) ? (float) $data['gaji_pokok'] : $oldGaji;
    $tunj = array_key_exists('tunjangan', $data) ? (float) ($data['tunjangan'] ?? 0) : $oldTunj;
    $pot  = array_key_exists('potongan', $data) ? (float) ($data['potongan'] ?? 0) : $oldPot;

    $total = $gaji + $tunj - $pot;

    $periode = null;
    if (array_key_exists('periode', $data)) {
        $periode = Carbon::parse($data['periode'])->startOfMonth();
        $data['periode'] = $periode->toDateString();
    }

    // 3) Cegah duplikat periode
    if ($periode) {
        $exists = Payroll::where('employee_id', $payroll->employee_id)
            ->whereYear('periode', $periode->year)
            ->whereMonth('periode', $periode->month)
            ->where('id', '!=', $payroll->id)
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Payroll untuk employee dan bulan ini sudah ada.',
                'errors'  => ['periode' => ['Payroll bulan ini sudah dibuat.']],
            ], 422);
        }
    }


    // 4) Cipher-only: plaintext NULL
    $data['gaji_pokok'] = null;
    $data['tunjangan']  = null;
    $data['potongan']   = null;
    $data['total']      = null;
    if (array_key_exists('catatan', $data)) $data['catatan'] = null;

    // 5) Update ciphertext
    $data['gaji_pokok_enc'] = $enc((string) $gaji);
    $data['tunjangan_enc']  = $enc((string) $tunj);
    $data['potongan_enc']   = $enc((string) $pot);
    $data['total_enc']      = $enc((string) $total);

    if (array_key_exists('catatan', $data)) {
        $data['catatan_enc'] = !empty($request->input('catatan'))
            ? $enc((string) $request->input('catatan'))
            : null;
    }

    // ✅ METADATA INI WAJIB ADA sebelum update()
    $data['salary_alg']    = $alg;
    $data['salary_key_id'] = $keyId; // ✅ INI TEMPATNYA

    $payroll->update($data);

    $this->audit($request, 'PAYROLL_UPDATE', $payroll, [
        'fields_updated' => array_keys($data),
        'employee_id'    => $payroll->employee_id,
        'periode'        => optional($payroll->periode)->toDateString(),
        'alg'            => $alg,
        'key_id'         => $keyId,
    ]);

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