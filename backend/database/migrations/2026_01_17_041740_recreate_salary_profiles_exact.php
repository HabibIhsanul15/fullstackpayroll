<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('salary_profiles');

        Schema::create('salary_profiles', function (Blueprint $table) {
            // ===== URUTAN KOLOM (JANGAN DIUBAH) =====
            $table->id(); // id (auto increment)

            $table->unsignedBigInteger('employee_id');

            $table->decimal('base_salary', 15, 2)->default(0);
            $table->text('base_salary_enc')->nullable();

            $table->decimal('allowance_fixed', 15, 2)->default(0);
            $table->text('allowance_fixed_enc')->nullable();

            $table->decimal('deduction_fixed', 15, 2)->default(0);
            $table->text('deduction_fixed_enc')->nullable();

            $table->decimal('daily_rate', 15, 2)->nullable();
            $table->text('daily_rate_enc')->nullable();

            $table->decimal('overtime_rate_per_hour', 15, 2)->nullable();
            $table->text('overtime_rate_per_hour_enc')->nullable();

            $table->decimal('late_penalty_per_minute', 15, 2)->nullable();
            $table->text('late_penalty_per_minute_enc')->nullable();

            $table->string('salary_alg', 20)->default('AES');
            $table->string('salary_key_id', 50)->nullable();

            $table->date('effective_from');

            $table->timestamps(); // created_at, updated_at (di paling akhir)
        });

        // FK (kalau tabel employees ada)
        Schema::table('salary_profiles', function (Blueprint $table) {
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('salary_profiles');
        Schema::enableForeignKeyConstraints();
    }
};
