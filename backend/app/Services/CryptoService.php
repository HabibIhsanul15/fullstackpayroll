<?php

namespace App\Services;

use App\Exceptions\CryptoException;
use RuntimeException;
use App\Models\CryptoKey;
use Illuminate\Support\Facades\Crypt;


class CryptoService
{
    /**
     * Ambil AES-128 key dari env
     * - wajib 16 byte (128-bit)
     */
    private static function key(): string
    {
        $key = (string) env('AES_KEY_128', '');

        // Untuk sekarang: asumsi key raw string 16 byte.
        // (Kalau nanti kamu pakai base64 key, logic ini perlu diubah.)
        if (strlen($key) !== 16) {
            throw new RuntimeException("AES_KEY_128 harus 16 karakter/byte.");
        }

        return $key;
    }

    /**
     * Identifier key untuk audit/rotasi (nilai plus untuk TA)
     */
    public static function keyId(): string
    {
        // stabil dan tidak bocorkan key
        return 'aes128:' . substr(hash('sha256', self::key()), 0, 12);
    }

    // =====================================================
    // MODE: TRANSITION vs CIPHER_ONLY
    // =====================================================
    public static function salaryStorageMode(): string
    {
        return strtoupper((string) config('crypto.salary_storage_mode', 'TRANSITION'));
    }

    // =====================================================
    // ROUTER (buat sekarang AES dulu, nanti tambah RSA/HYBRID)
    // =====================================================

    /**
     * Decrypt berdasarkan algoritma pada record (salary_alg).
     * Untuk saat ini baru dukung AES. Nanti tinggal tambah RSA/HYBRID.
     */
    public static function decryptByAlg(?string $payload, ?string $alg): ?string
    {
        if (!$payload) return null;

        $alg = strtoupper((string) ($alg ?: 'AES'));

        return match ($alg) {
            'AES' => self::decryptAESGCM($payload),

            // nanti kamu tambah:
            'RSA' => self::decryptRSA($payload),
            'HYBRID' => self::decryptHybrid($payload),

            default => throw new CryptoException("Decrypt not implemented for alg: {$alg}"),
        };
    }

    /**
     * Helper baca nilai:
     * - TRANSITION: pakai plaintext kalau ada, fallback decrypt
     * - CIPHER_ONLY: wajib decrypt dari ciphertext
     */
    public static function readEncryptedOrPlain($enc, $plain, string $alg = 'AES')
    {
        $mode = self::readMode();
        $alg  = strtoupper((string) $alg);

        if ($mode === 'CIPHER_ONLY') {
            return match ($alg) {
                'AES' => self::decryptAESGCM($enc),
                'RSA' => self::decryptRSA($enc),
                'HYBRID' => self::decryptHybrid($enc),
                default => throw new \RuntimeException("Algoritma tidak dikenali: {$alg}"),
            };
        }

        if ($plain !== null && $plain !== '') return $plain;

        if ($enc) {
            return match ($alg) {
                'AES' => self::decryptAESGCM($enc),
                'RSA' => self::decryptRSA($enc),
                default => null,
            };
        }

        return null;
    }

    /**
     * SAFE decrypt by alg (tidak throw)
     */
    public static function safeDecryptByAlg(?string $payload, ?string $alg): ?string
    {
        if ($payload === null || $payload === '') return null;

        try {
            return self::decryptByAlg($payload, $alg);
        } catch (\Throwable $e) {
            return null;
        }
    }

    // =====================================================
    // AES-128-GCM
    // =====================================================

    /**
     * Encrypt AES-128-GCM
     * Output: base64(iv(12) + tag(16) + cipher)
     */
    public static function encryptAESGCM(string $plain): string
    {
        $iv = random_bytes(12); // 96-bit nonce untuk GCM
        $tag = '';

        $cipher = openssl_encrypt(
            $plain,
            'aes-128-gcm',
            self::key(),
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($cipher === false) {
            throw new CryptoException('Encrypt failed.');
        }

        return base64_encode($iv . $tag . $cipher);
    }

    /**
     * Decrypt AES-128-GCM (STRICT)
     * - lempar CryptoException kalau gagal
     */
    public static function decryptAESGCM(?string $b64): ?string
    {
        if (!$b64) return null;

        try {
            $raw = base64_decode($b64, true);
            if ($raw === false) {
                throw new CryptoException("Ciphertext base64 invalid.");
            }

            // minimal length = 12 + 16 = 28
            if (strlen($raw) < 28) {
                throw new CryptoException("Ciphertext format invalid (too short).");
            }

            $iv = substr($raw, 0, 12);
            $tag = substr($raw, 12, 16);
            $cipher = substr($raw, 28);

            $plain = openssl_decrypt(
                $cipher,
                'aes-128-gcm',
                self::key(),
                OPENSSL_RAW_DATA,
                $iv,
                $tag
            );

            if ($plain === false) {
                throw new CryptoException("Decrypt failed.");
            }

            return $plain;
        } catch (\Throwable $e) {
            if ($e instanceof CryptoException) throw $e;
            throw new CryptoException('Decrypt failed.');
        }
    }

    /**
     * Decrypt AES-128-GCM (SAFE)
     * - tidak pernah throw
     * - kalau gagal -> null
     */
    public static function safeDecryptAESGCM(?string $b64): ?string
    {
        if ($b64 === null || $b64 === '') return null;

        try {
            return self::decryptAESGCM($b64);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public static function readEncryptedOrPlainSafe(?string $enc, $plain, string $alg = 'AES'): ?string
{
    try {
        return self::readEncryptedOrPlain($enc, $plain, $alg);
    } catch (\Throwable $e) {
        // Optional: log internal
        // logger()->warning('readEncryptedOrPlainSafe failed', ['alg' => $alg, 'err' => $e->getMessage()]);
        return null;
    }
}

    public static function encryptRSA(string $plain): string
    {
        $key = self::activeRsaKey();
        $ok = openssl_public_encrypt(
            $plain,
            $cipherBin,
            $key->public_key_pem,
            OPENSSL_PKCS1_OAEP_PADDING
        );

        if (!$ok) {
            throw new CryptoException('RSA encrypt failed: ' . openssl_error_string());
        }

        // Simpan sebagai JSON biar record "self-contained"
        // (karena kolom payroll kamu tidak punya iv/tag khusus RSA)
        return json_encode([
            'v' => 1,
            'alg' => 'RSA-2048-OAEP',
            'rsa_key_id' => $key->id,
            'ct' => base64_encode($cipherBin),
        ], JSON_UNESCAPED_SLASHES);
    }

    public static function decryptRSA(?string $payloadJson): ?string
{
    if (!$payloadJson) return null;

    $payload = json_decode($payloadJson, true);
    if (!is_array($payload) || empty($payload['ct']) || empty($payload['rsa_key_id'])) {
        throw new CryptoException("RSA payload invalid.");
    }

    $keyId = (int) $payload['rsa_key_id'];
// kalau payload mengacu ke key aktif, pakai cache private pem
    if (self::$activeRsaKeyCache && self::$activeRsaKeyCache->id === $keyId) {
        $privatePem = self::activePrivatePem();
    } else {
        $key = CryptoKey::findOrFail($keyId);
        $privatePem = Crypt::decryptString($key->private_key_pem_enc);
    }

    $cipherBin = base64_decode($payload['ct'], true);
    if ($cipherBin === false) {
        throw new CryptoException("RSA ciphertext base64 invalid.");
    }

    $ok = openssl_private_decrypt(
        $cipherBin,
        $plain,
        $privatePem,
        OPENSSL_PKCS1_OAEP_PADDING
    );

    if (!$ok) {
        throw new CryptoException("RSA decrypt failed: " . openssl_error_string());
    }

    return $plain;
}

public static function rsaKeyId(): string
{
    $key = CryptoKey::where('status','active')->firstOrFail();
    return 'rsa2048:' . $key->id;
}

    public static function encryptHybrid(string $plain): string
    {
        // 1) ambil RSA key aktif
        $rsa = self::activeRsaKey();

        // 2) buat AES-128 key random (16 byte)
        $aesKey = random_bytes(16);

        // 3) encrypt data pakai AES-128-GCM
        $iv  = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt(
            $plain,
            'aes-128-gcm',
            $aesKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($cipher === false) {
            throw new CryptoException('HYBRID AES encrypt failed: ' . openssl_error_string());
        }

        // 4) encrypt AES key pakai RSA public key (OAEP)
        $ok = openssl_public_encrypt(
            $aesKey,
            $ekBin,
            $rsa->public_key_pem,
            OPENSSL_PKCS1_OAEP_PADDING
        );

        if (!$ok) {
            throw new CryptoException('HYBRID RSA encrypt key failed: ' . openssl_error_string());
        }

        // 5) simpan JSON payload
        return json_encode([
            'v' => 1,
            'alg' => 'HYBRID-RSA2048-OAEP-AES128-GCM',
            'rsa_key_id' => (int) $rsa->id,
            'ek' => base64_encode($ekBin),
            'iv' => base64_encode($iv),
            'tag' => base64_encode($tag),
            'ct' => base64_encode($cipher),
        ], JSON_UNESCAPED_SLASHES);
    }


    public static function decryptHybrid(?string $payloadJson): ?string
    {
        if (!$payloadJson) return null;

        $p = json_decode($payloadJson, true);
        if (!is_array($p)) {
            throw new CryptoException('HYBRID payload invalid JSON.');
        }

        foreach (['ek','iv','tag','ct','rsa_key_id'] as $k) {
            if (empty($p[$k])) throw new CryptoException("HYBRID payload missing: {$k}");
        }

        $keyId = (int) $p['rsa_key_id'];

        if (self::$activeRsaKeyCache && self::$activeRsaKeyCache->id === $keyId) {
            $privatePem = self::activePrivatePem();
        } else {
            $rsa = CryptoKey::findOrFail($keyId);
            $privatePem = Crypt::decryptString($rsa->private_key_pem_enc);
        }

        $ek  = base64_decode($p['ek'], true);
        $iv  = base64_decode($p['iv'], true);
        $tag = base64_decode($p['tag'], true);
        $ct  = base64_decode($p['ct'], true);

        if ($ek === false || $iv === false || $tag === false || $ct === false) {
            throw new CryptoException('HYBRID base64 decode failed.');
        }

        // 1) decrypt AES key pakai RSA private key
        $ok = openssl_private_decrypt(
            $ek,
            $aesKey,
            $privatePem,
            OPENSSL_PKCS1_OAEP_PADDING
        );

        if (!$ok) {
            throw new CryptoException('HYBRID RSA decrypt key failed: ' . openssl_error_string());
        }

        // 2) decrypt data pakai AES-128-GCM
        $plain = openssl_decrypt(
            $ct,
            'aes-128-gcm',
            $aesKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plain === false) {
            throw new CryptoException('HYBRID AES decrypt failed: ' . openssl_error_string());
        }

        return $plain;
    }

    public static function hybridKeyId(): string
    {
        $key = CryptoKey::where('status','active')->firstOrFail();
        return 'hybrid:rsa2048:' . $key->id;
    }

    public static function writeAlg(): string
    {
        return strtoupper((string) config('crypto.payroll_write_alg', 'AES'));
    }

    public static function readMode(): string
    {
        return strtoupper((string) config('crypto.payroll_read_mode', 'TRANSITION'));
    }

    private static ?CryptoKey $activeRsaKeyCache = null;
    private static ?string $activePrivatePemCache = null;

    private static function activeRsaKey(): CryptoKey
    {
        if (self::$activeRsaKeyCache) return self::$activeRsaKeyCache;

        $key = CryptoKey::where('status', 'active')->firstOrFail();
        self::$activeRsaKeyCache = $key;
        return $key;
    }

    private static function activePrivatePem(): string
    {
        if (self::$activePrivatePemCache) return self::$activePrivatePemCache;

        $key = self::activeRsaKey();
        self::$activePrivatePemCache = Crypt::decryptString($key->private_key_pem_enc);
        return self::$activePrivatePemCache;
    }

}
