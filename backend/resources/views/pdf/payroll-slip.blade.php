<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Slip Gaji</title>
  <style>
    /* DomPDF friendly styles */
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; }
    .muted { color: #6b7280; }
    .title { font-size: 18px; font-weight: 700; margin: 0; }
    .subtitle { margin-top: 4px; }
    .row { width: 100%; }
    .box {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px;
      margin-top: 12px;
    }
    .box h3 { margin: 0 0 10px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 5px 0; vertical-align: top; }
    .right { text-align: right; }
    .line { border-top: 1px solid #e5e7eb; margin: 10px 0; }
    .total { font-weight: 700; font-size: 13px; }
    .footer { margin-top: 12px; font-size: 10px; }
    .brand {
      font-weight: 700;
      font-size: 13px;
    }
  </style>
</head>
<body>

  @php
    $rupiah = fn($n) => 'Rp ' . number_format((float)($n ?? 0), 0, ',', '.');
    $periode = optional($payroll->periode)->format('Y-m-d');
    $code = $payroll->employee?->employee_code ?? $payroll->employee_id;
  @endphp

  <div class="row">
    <div class="brand">Human Plus Institute, Jakarta</div>
    <p class="title">Slip Gaji Karyawan</p>
    <div class="subtitle muted">
      Periode: <strong>{{ $periode }}</strong> &nbsp;|&nbsp;
      Kode Payroll: <strong>#{{ $payroll->id }}</strong>
    </div>
  </div>

  <div class="box">
    <h3>Informasi Karyawan</h3>
    <table>
      <tr>
        <td class="muted">Nama</td>
        <td class="right"><strong>{{ $payroll->employee?->name ?? '-' }}</strong></td>
      </tr>
      <tr>
        <td class="muted">Kode Pegawai</td>
        <td class="right">{{ $payroll->employee?->employee_code ?? '-' }}</td>
      </tr>
      <tr>
        <td class="muted">Status Pegawai</td>
        <td class="right">{{ $payroll->employee?->status ?? '-' }}</td>
      </tr>
      <tr>
        <td class="muted">Dibuat Oleh</td>
        <td class="right">{{ $payroll->user?->name ?? '-' }}</td>
      </tr>
    </table>
  </div>

  <div class="box">
    <h3>Rincian Gaji</h3>
    <table>
      <tr>
        <td class="muted">Gaji Pokok</td>
        <td class="right">{{ $rupiah($payroll->gaji_pokok) }}</td>
      </tr>
      <tr>
        <td class="muted">Tunjangan</td>
        <td class="right">{{ $rupiah($payroll->tunjangan) }}</td>
      </tr>
      <tr>
        <td class="muted">Potongan</td>
        <td class="right">{{ $rupiah($payroll->potongan) }}</td>
      </tr>
    </table>

    <div class="line"></div>

    <table>
      <tr>
        <td class="total">Total</td>
        <td class="right total">{{ $rupiah($payroll->total) }}</td>
      </tr>
    </table>

    @if(!empty($payroll->catatan))
      <div class="line"></div>
      <div class="muted" style="font-size:11px;">Catatan</div>
      <div>{{ $payroll->catatan }}</div>
    @endif
  </div>

  <div class="footer muted">
    Dokumen ini dihasilkan otomatis oleh sistem. Simpan/print sesuai kebutuhan.
  </div>

</body>
</html>
