<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\AdminUserController;

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'registerStaff']); // staff only
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | PAYROLL
    |--------------------------------------------------------------------------
    */
    Route::get('/payrolls', [PayrollController::class, 'index']);
    Route::post('/payrolls', [PayrollController::class, 'store']);
    Route::get('/payrolls/{payroll}', [PayrollController::class, 'show']);
    Route::put('/payrolls/{payroll}', [PayrollController::class, 'update']);
    Route::patch('/payrolls/{payroll}', [PayrollController::class, 'update']);
    Route::delete('/payrolls/{payroll}', [PayrollController::class, 'destroy']);
    Route::get('/payrolls/{payroll}/pdf', [PayrollController::class, 'pdf']);

    /*
    |--------------------------------------------------------------------------
    | EMPLOYEES (PAYROLL ONLY)
    |--------------------------------------------------------------------------
    */
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
    Route::get('/employees/{employee}/salary-profile', [EmployeeController::class, 'salaryProfile']);
    Route::post('/employees/{employee}/salary-profiles', [EmployeeController::class, 'storeSalaryProfile']);

    /*
    |--------------------------------------------------------------------------
    | ADMIN USERS (FAT / DIRECTOR)
    |--------------------------------------------------------------------------
    */
    Route::post('/admin/users', [AdminUserController::class, 'store']);
    // ADMIN USERS (FAT / DIRECTOR)
    Route::post('/admin/users', [AdminUserController::class, 'store']);


    /*
    |--------------------------------------------------------------------------
    | ME
    |--------------------------------------------------------------------------
    */
    Route::get('/me', [MeController::class, 'me']);
    Route::put('/me', [MeController::class, 'updateMe']);              
    Route::put('/me/password', [MeController::class, 'updatePassword']);

    Route::get('/me/employee', [MeController::class, 'employee']);
    Route::put('/me/employee', [MeController::class, 'updateEmployee']);


});
