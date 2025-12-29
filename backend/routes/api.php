<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\EmployeeController;

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

/*
|--------------------------------------------------------------------------
| PAYROLL
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/payrolls', [PayrollController::class, 'index']);
    Route::post('/payrolls', [PayrollController::class, 'store']); // ✅ cukup 1x
    Route::get('/payrolls/{payroll}', [PayrollController::class, 'show']);
    Route::put('/payrolls/{payroll}', [PayrollController::class, 'update']);
    Route::patch('/payrolls/{payroll}', [PayrollController::class, 'update']);
    Route::delete('/payrolls/{payroll}', [PayrollController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| EMPLOYEES
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);

    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);

    Route::get('/employees/{employee}/salary-profile', [EmployeeController::class, 'salaryProfile']);
    Route::post('/employees/{employee}/salary-profiles', [EmployeeController::class, 'storeSalaryProfile']);
});
