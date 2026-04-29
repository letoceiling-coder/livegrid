<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CrmSetting;
use Illuminate\Http\JsonResponse;

class ContactsController extends Controller
{
    public function show(): JsonResponse
    {
        $email = (string) (CrmSetting::query()->where('key', 'contacts.email')->value('value') ?? 'info@livegrid.ru');
        $address = (string) (CrmSetting::query()->where('key', 'contacts.address')->value('value') ?? 'Белгород, офис Live Grid');
        $workHours = (string) (CrmSetting::query()->where('key', 'contacts.work_hours')->value('value') ?? 'пн–пт 9:00–18:00');

        return response()->json([
            'phone' => '+7 (904) 539-34-34',
            'email' => $email,
            'address' => $address,
            'workHours' => $workHours,
            'siteUrl' => 'https://livegrid.ru',
            'contactsUrl' => 'https://livegrid.ru/contacts',
        ]);
    }
}
