<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TelegramAuthController extends Controller
{
    public function createCode(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Не авторизован.'], 401);
        }

        return response()->json($this->issueCodeForUser($user->id));
    }

    public function createCodeByCredentials(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::query()->where('email', $validated['email'])->first();
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Неверные учётные данные.'],
            ]);
        }

        return response()->json($this->issueCodeForUser($user->id));
    }

    public function exchangeCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|size:6',
            'telegram_id' => 'required|integer|min:1',
        ]);

        $now = CarbonImmutable::now();
        $codeRow = DB::table('telegram_auth_codes')
            ->where('code', $validated['code'])
            ->whereNull('used_at')
            ->where('expires_at', '>', $now)
            ->orderByDesc('id')
            ->first();

        if (!$codeRow) {
            throw ValidationException::withMessages([
                'code' => ['Код недействителен. Запросите новый на сайте.'],
            ]);
        }

        $alreadyBound = User::query()
            ->where('telegram_id', (int) $validated['telegram_id'])
            ->where('id', '!=', (int) $codeRow->user_id)
            ->exists();

        if ($alreadyBound) {
            throw ValidationException::withMessages([
                'telegram_id' => ['Этот Telegram уже привязан к другому аккаунту.'],
            ]);
        }

        /** @var User $user */
        $user = User::query()->findOrFail((int) $codeRow->user_id);
        $user->telegram_id = (int) $validated['telegram_id'];
        $user->save();

        DB::table('telegram_auth_codes')
            ->where('id', $codeRow->id)
            ->update([
                'used_at' => $now,
                'updated_at' => $now,
            ]);

        $user->tokens()->where('name', 'telegram-bot')->delete();
        $token = $user->createToken('telegram-bot')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function refreshToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'telegram_id' => 'required|integer|min:1',
        ]);

        $secret = (string) env('JWT_SECRET', '');
        $incoming = (string) $request->header('x-telegram-bot-secret', '');
        if ($secret === '' || $incoming === '' || !hash_equals($secret, $incoming)) {
            return response()->json(['message' => 'Нет доступа.'], 403);
        }

        /** @var User|null $user */
        $user = User::query()->where('telegram_id', (int) $validated['telegram_id'])->first();
        if (!$user) {
            return response()->json(['message' => 'Пользователь не найден.'], 404);
        }

        $user->tokens()->where('name', 'telegram-bot')->delete();
        $token = $user->createToken('telegram-bot')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    private function issueCodeForUser(int $userId): array
    {
        $now = CarbonImmutable::now();
        $expiresAt = $now->addMinutes(10);
        $code = (string) random_int(100000, 999999);

        DB::table('telegram_auth_codes')
            ->where('user_id', $userId)
            ->whereNull('used_at')
            ->where('expires_at', '>', $now)
            ->update(['used_at' => $now, 'updated_at' => $now]);

        DB::table('telegram_auth_codes')->insert([
            'user_id' => $userId,
            'code' => $code,
            'expires_at' => $expiresAt,
            'used_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return [
            'code' => $code,
            'expiresAt' => $expiresAt->toIso8601String(),
        ];
    }
}
