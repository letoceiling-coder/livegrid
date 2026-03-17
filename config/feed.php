<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Feed Base URL
    |--------------------------------------------------------------------------
    |
    | Base URL for feed endpoints. Will be extracted from FEED_ENDPOINT_PRIMARY
    | by removing the filename.
    |
    | Example:
    | FEED_ENDPOINT_PRIMARY=https://domain.com/msk/about.json
    | Base URL will be: https://domain.com/msk
    |
    */

    'base_url' => env('FEED_ENDPOINT_PRIMARY', '')
        ? rtrim(dirname(env('FEED_ENDPOINT_PRIMARY', '')), '/')
        : env('FEED_BASE_URL', ''),

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    |
    | Authentication method and credentials for feed endpoints.
    | Supported: 'bearer', 'basic', 'query', null
    |
    */

    'auth' => [
        'type' => env('FEED_AUTH_TYPE', null), // 'bearer', 'basic', 'query', null
        'token' => env('FEED_AUTH_TOKEN', ''),
        'username' => env('FEED_AUTH_USERNAME', ''),
        'password' => env('FEED_AUTH_PASSWORD', ''),
        'query_param' => env('FEED_AUTH_QUERY_PARAM', 'token'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Feed Endpoints
    |--------------------------------------------------------------------------
    |
    | List of endpoints to download. Filenames will be appended to base_url.
    |
    */

    'endpoints' => [
        'regions.json',
        'subways.json',
        'builders.json',
        'finishings.json',
        'buildingtypes.json',
        'rooms.json',
        'blocks.json',
        'buildings.json',
        'apartments.json',
    ],

    /*
    |--------------------------------------------------------------------------
    | Storage Path
    |--------------------------------------------------------------------------
    |
    | Path where raw feed files will be stored.
    |
    */

    'storage_path' => 'feed/raw',

    /*
    |--------------------------------------------------------------------------
    | HTTP Client Settings
    |--------------------------------------------------------------------------
    |
    | Settings for HTTP client requests.
    |
    */

    'timeout' => env('FEED_TIMEOUT', 300), // 5 minutes for large files
    'connect_timeout' => env('FEED_CONNECT_TIMEOUT', 30),
];
