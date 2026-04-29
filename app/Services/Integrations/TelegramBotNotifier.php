<?php

namespace App\Services\Integrations;

use App\Models\CrmSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramBotNotifier
{
    public function notifyRegistration(array $payload): void
    {
        $this->send('registration', $payload);
    }

    public function notifyLead(array $payload): void
    {
        $this->send('lead', $payload);
    }

    private function send(string $type, array $payload): void
    {
        $url = (string) CrmSetting::query()->where('key', 'telegram.notify_url')->value('value');
        if ($url === '') {
            return;
        }

        try {
            $request = Http::timeout(5)->acceptJson();
            $token = (string) CrmSetting::query()->where('key', 'telegram.notify_token')->value('value');
            if ($token !== '') {
                $request = $request->withHeaders(['x-internal-token' => $token]);
            }

            $request->post($url, [
                'type' => $type,
                'payload' => $payload,
            ])->throw();
        } catch (\Throwable $e) {
            Log::warning('[TelegramBotNotifier] notify failed', [
                'type' => $type,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
