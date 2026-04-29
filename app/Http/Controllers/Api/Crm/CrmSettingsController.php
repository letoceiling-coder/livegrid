<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\CrmSetting;
use App\Services\Integrations\TelegramBotNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmSettingsController extends Controller
{
    public function testTelegram(Request $request, TelegramBotNotifier $notifier): JsonResponse
    {
        $request->validate([
            'kind' => 'nullable|string|in:registration,lead',
        ]);

        $kind = (string) $request->input('kind', 'registration');
        if ($kind === 'lead') {
            $notifier->notifyLead([
                'requestId' => 'test-' . now()->timestamp,
                'name' => 'Тестовый клиент',
                'phone' => '+7 (900) 000-00-00',
                'kind' => 'Тестовая заявка',
                'objectName' => 'Тестовый ЖК',
                'objectUrl' => 'https://livegrid.ru/complex/test',
                'managerName' => 'CRM',
                'createdAt' => now()->format('d.m.Y, H:i'),
            ]);
        } else {
            $notifier->notifyRegistration([
                'name' => 'Тестовый пользователь',
                'email' => 'test@example.com',
                'createdAt' => now()->format('d.m.Y, H:i'),
            ]);
        }

        return response()->json(['ok' => true]);
    }

    private const TELEGRAM_NOTIFY_URL = 'telegram.notify_url';
    private const TELEGRAM_NOTIFY_TOKEN = 'telegram.notify_token';
    private const CONTACTS_EMAIL = 'contacts.email';
    private const CONTACTS_ADDRESS = 'contacts.address';
    private const CONTACTS_WORK_HOURS = 'contacts.work_hours';

    public function showTelegram(): JsonResponse
    {
        return response()->json([
            'notifyUrl' => $this->get(self::TELEGRAM_NOTIFY_URL),
            'notifyToken' => $this->get(self::TELEGRAM_NOTIFY_TOKEN),
        ]);
    }

    public function showContacts(): JsonResponse
    {
        return response()->json([
            'email' => $this->get(self::CONTACTS_EMAIL) ?? 'info@livegrid.ru',
            'address' => $this->get(self::CONTACTS_ADDRESS) ?? 'Белгород, офис Live Grid',
            'workHours' => $this->get(self::CONTACTS_WORK_HOURS) ?? 'пн–пт 9:00–18:00',
        ]);
    }

    public function updateContacts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'address' => 'required|string|max:255',
            'workHours' => 'required|string|max:120',
        ]);

        $this->set(self::CONTACTS_EMAIL, $validated['email']);
        $this->set(self::CONTACTS_ADDRESS, $validated['address']);
        $this->set(self::CONTACTS_WORK_HOURS, $validated['workHours']);

        return $this->showContacts();
    }

    public function updateTelegram(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'notifyUrl' => 'nullable|url|max:500',
            'notifyToken' => 'nullable|string|max:255',
        ]);

        $this->set(self::TELEGRAM_NOTIFY_URL, $validated['notifyUrl'] ?? null);
        $this->set(self::TELEGRAM_NOTIFY_TOKEN, $validated['notifyToken'] ?? null);

        return $this->showTelegram();
    }

    private function get(string $key): ?string
    {
        return CrmSetting::query()->where('key', $key)->value('value');
    }

    private function set(string $key, ?string $value): void
    {
        CrmSetting::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value !== null ? trim($value) : null]
        );
    }
}
