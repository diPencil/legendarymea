<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Enums\UserStatus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateSuperAdminCommand extends Command
{
    protected $signature = 'legendary:create-super-admin';
    protected $description = 'Create a new super admin interactively';

    public function handle()
    {
        $this->info('Create Super Admin');
        
        $name = $this->ask('Name');
        $email = $this->ask('Email');
        $username = $this->ask('Username');
        
        $validator = Validator::make([
            'email' => $email,
            'username' => $username,
        ], [
            'email' => 'required|email|unique:users,email',
            'username' => ['required', 'string', 'min:3', 'max:40', 'regex:/^[a-z0-9._-]+$/', 'unique:users,username'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return 1;
        }

        $password = $this->secret('Password');
        $passwordConfirm = $this->secret('Confirm Password');

        if ($password !== $passwordConfirm) {
            $this->error('Passwords do not match.');
            return 1;
        }

        $user = User::create([
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'password' => Hash::make($password),
            'status' => UserStatus::ACTIVE,
        ]);

        $user->assignRole('super_admin');

        $this->info('Super admin created successfully!');
        return 0;
    }
}
