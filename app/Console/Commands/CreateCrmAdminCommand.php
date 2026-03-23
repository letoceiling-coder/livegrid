<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateCrmAdminCommand extends Command
{
    protected $signature = 'crm:create-admin
                            {email : Admin email address}
                            {password : Password (only applied on first creation)}
                            {name? : Display name}
                            {--force-password : Overwrite password even if user already exists}';

    protected $description = 'Create or promote a user as CRM admin (idempotent — safe to run on every deploy)';

    public function handle(): int
    {
        $email    = $this->argument('email');
        $password = $this->argument('password');
        $name     = $this->argument('name') ?? 'Admin';

        $existing = User::where('email', $email)->first();

        if ($existing) {
            // User exists — only promote to admin and update name.
            // Do NOT overwrite password unless --force-password is given.
            $existing->name     = $name;
            $existing->is_admin = true;

            if ($this->option('force-password')) {
                $existing->password = Hash::make($password);
                $this->line("  🔑 Password updated (--force-password)");
            }

            $existing->save();

            $this->info("✅ Existing user promoted to admin: {$email}");
        } else {
            // User does not exist — create fresh with all fields.
            User::create([
                'email'    => $email,
                'name'     => $name,
                'password' => Hash::make($password),
                'is_admin' => true,
            ]);

            $this->info("✅ New admin user created: {$email}");
        }

        return self::SUCCESS;
    }
}
