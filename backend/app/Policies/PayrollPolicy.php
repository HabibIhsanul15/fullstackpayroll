<?php

namespace App\Policies;

use App\Models\Payroll;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class PayrollPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['staff','fat','director'], true);
    }

    public function view(User $user, Payroll $payroll): bool
    {
        if (in_array($user->role, ['fat','director'], true)) return true;
        return $user->role === 'staff' && $payroll->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['fat','director'], true);
    }

    public function update(User $user, Payroll $payroll): bool
    {
        return in_array($user->role, ['fat','director'], true);
    }

    public function delete(User $user, Payroll $payroll): bool
    {
        return in_array($user->role, ['fat','director'], true);
    }

        /**
         * Determine whether the user can restore the model.
         */
    public function restore(User $user, Payroll $payroll): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Payroll $payroll): bool
    {
        return false;
    }
}
