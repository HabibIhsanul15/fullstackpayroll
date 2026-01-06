<?php

namespace App\Services;

use App\Exceptions\CryptoException;
use RuntimeException;

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
        // butuh config/crypto.php
        // return ['salary_storage_mode' => env('SALARY_STORAGE_MODE', 'TRANSITION')];
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
            // 'RSA' => self::decryptRSA($payload),
            // 'HYBRID' => self::decryptHybrid($payload),

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
        $mode = env('PAYROLL_READ_MODE', 'TRANSITION'); // TRANSITION | CIPHER_ONLY

        // Mode cipher-only: WAJIB decrypt, jangan pernah pakai plaintext
        if ($mode === 'CIPHER_ONLY') {
            return match ($alg) {
                'AES' => self::decryptAESGCM($enc),
                default => throw new \RuntimeException("Algoritma tidak dikenali: {$alg}"),
            };
        }

        // Mode transisi: kalau plaintext ada, pakai plaintext
        if ($plain !== null && $plain !== '') return $plain;

        // Kalau plaintext kosong, baru decrypt
        if ($enc) {
            return match ($alg) {
                'AES' => self::decryptAESGCM($enc),
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

}
