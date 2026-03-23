<?php
ini_set("display_errors", 1);
error_reporting(E_ALL);
chdir("/var/www/livegrid");
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$body = json_encode(["email" => "dsc-23@yandex.ru", "password" => "123123123"]);
$request = Illuminate\Http\Request::create("/api/v1/crm/auth/login", "POST", [], [], [], [], $body);
$request->headers->set("Content-Type", "application/json");
$request->headers->set("Accept", "application/json");
$response = $kernel->handle($request);
echo "STATUS: " . $response->getStatusCode() . PHP_EOL;
$data = json_decode($response->getContent(), true);
if ($response->getStatusCode() != 200) {
    echo "MESSAGE: " . ($data['message'] ?? 'no message') . PHP_EOL;
    echo "FILE: " . ($data['file'] ?? 'n/a') . PHP_EOL;
} else {
    echo "TOKEN: " . substr($data['token'] ?? '', 0, 20) . "..." . PHP_EOL;
}
