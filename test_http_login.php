<?php
// Simulate real HTTP request through nginx via PHP stream
$url = "https://dev.livegrid.ru/api/v1/crm/auth/login";
$body = json_encode(["email" => "dsc-23@yandex.ru", "password" => "123123123"]);

$context = stream_context_create([
    'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\nAccept: application/json\r\nContent-Length: " . strlen($body),
        'content' => $body,
        'ignore_errors' => true,
    ]
]);

$response = file_get_contents($url, false, $context);
$statusLine = $http_response_header[0] ?? 'No status';
echo "HTTP STATUS: $statusLine\n";
echo "BODY: " . substr($response, 0, 2000) . "\n";
