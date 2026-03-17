# Инструкция по загрузке файлов на сервер

## Текущий статус

✅ Базовый Laravel проект создан на сервере
✅ .env настроен (production, redis, queue)
✅ База данных создана
✅ Права доступа установлены

## Что нужно сделать

### Вариант 1: Загрузка через SCP (рекомендуется)

С локальной машины выполните:

```bash
# Загрузить весь проект
scp -r C:\OSPanel\domains\livegrid\* root@85.198.64.93:/var/www/livegrid/

# Или только нужные директории
scp -r C:\OSPanel\domains\livegrid\app root@85.198.64.93:/var/www/livegrid/
scp -r C:\OSPanel\domains\livegrid\database root@85.198.64.93:/var/www/livegrid/
scp -r C:\OSPanel\domains\livegrid\deployment root@85.198.64.93:/var/www/livegrid/
```

### Вариант 2: Через Git (если репозиторий заполнен)

```bash
ssh root@85.198.64.93
cd /var/www/livegrid
git remote remove origin
git remote add origin https://github.com/letoceiling-coder/livegrid.git
git pull origin main
```

### Вариант 3: Ручная загрузка через FTP/SFTP

Используйте FileZilla или другой FTP клиент для загрузки файлов.

## После загрузки файлов

Выполните на сервере:

```bash
ssh root@85.198.64.93
cd /var/www/livegrid

# Установить зависимости
composer install --no-dev --optimize-autoloader

# Настроить .env (если нужно)
nano .env
# Установите DB_DATABASE=livegrid и другие настройки БД

# Запустить миграции
php artisan migrate --force

# Настроить права
chown -R www-data:www-data /var/www/livegrid
chmod -R 775 storage bootstrap/cache

# Кешировать конфигурацию
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Проверка

```bash
php artisan migrate:status
php artisan --version
redis-cli ping
```
