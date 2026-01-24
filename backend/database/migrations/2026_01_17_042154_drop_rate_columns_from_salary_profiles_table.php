<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salary_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'daily_rate',
                'daily_rate_enc',
                'overtime_rate_per_hour',
                'overtime_rate_per_hour_enc',
                'late_penalty_per_minute',
                'late_penalty_per_minute_enc',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('salary_profiles', function (Blueprint $table) {
            // balikkan lagi kalau rollback
            $table->decimal('daily_rate', 15, 2)->nullable()->after('deduction_fixed_enc');
            $table->text('daily_rate_enc')->nullable()->after('daily_rate');

            $table->decimal('overtime_rate_per_hour', 15, 2)->nullable()->after('daily_rate_enc');
            $table->text('overtime_rate_per_hour_enc')->nullable()->after('overtime_rate_per_hour');

            $table->decimal('late_penalty_per_minute', 15, 2)->nullable()->after('overtime_rate_per_hour_enc');
            $table->text('late_penalty_per_minute_enc')->nullable()->after('late_penalty_per_minute');
        });
    }
};
