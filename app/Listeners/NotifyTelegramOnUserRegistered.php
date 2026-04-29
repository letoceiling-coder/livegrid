<?php

namespace App\Listeners;

use App\Services\Integrations\TelegramBotNotifier;
use Illuminate\Auth\Events\Registered;

class NotifyTelegramOnUserRegistered
{
    public function __construct(
        private TelegramBotNotifier $notifier
    ) {}

    public function handle(Registered $event): void
    {
        $user = $event->user;

        $this->notifier->notifyRegistration([
            'name' => (string) ($user->name ?? ''),
            'email' => (string) ($user->email ?? ''),
            'createdAt' => now()->format('d.m.Y, H:i'),
        ]);
    }
}
