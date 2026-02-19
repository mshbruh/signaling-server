# Инструкция по деплою на Render.com

## Быстрый старт

### 1. Создание GitHub репозитория

```bash
cd signaling-server
git init
git add .
git commit -m "Initial commit: MIXArx signaling server"
```

Создайте репозиторий на GitHub и загрузите код:

```bash
git remote add origin https://github.com/YOUR_USERNAME/mixarx-signaling-server.git
git branch -M main
git push -u origin main
```

### 2. Деплой на Render

1. Перейдите на [render.com](https://render.com) и войдите через GitHub
2. Нажмите **"New +"** → **"Web Service"**
3. Выберите ваш репозиторий `mixarx-signaling-server`
4. Заполните настройки:
   - **Name**: `mixarx-signaling-server` (или любое имя)
   - **Region**: выберите ближайший регион
   - **Branch**: `main`
   - **Root Directory**: оставьте пустым (если сервер в корне репозитория)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Выберите **Free** план
6. Нажмите **"Create Web Service"**

### 3. Ожидание деплоя

Render автоматически:
- Установит зависимости (`npm install`)
- Запустит сервер (`npm start`)
- Выдаст публичный URL

Процесс займет 2-5 минут.

### 4. Получение URL

После успешного деплоя вы увидите URL вида:
```
https://mixarx-signaling-server.onrender.com
```

Для WebSocket используйте протокол `wss://`:
```
wss://mixarx-signaling-server.onrender.com
```

### 5. Обновление приложения

Откройте файл `fuagram/lib/config/app_config.dart` и замените:

```dart
static const String SIGNALING_SERVER_URL = 'ws://10.10.243.195:8080';
```

на:

```dart
static const String SIGNALING_SERVER_URL = 'wss://mixarx-signaling-server.onrender.com';
```

Затем пересоберите приложение:

```bash
cd fuagram

# Для Windows
flutter build windows --release

# Для Android
flutter build apk --release
```

## Важные моменты

### Бесплатный тариф Render
- ✅ Бесплатно навсегда
- ✅ Поддержка WebSocket
- ✅ Автоматический HTTPS/WSS
- ⚠️ Сервер засыпает после 15 минут неактивности
- ⚠️ Первое подключение после сна занимает 30-60 секунд
- ⚠️ 750 часов работы в месяц (достаточно для большинства случаев)

### Проверка работы сервера

Откройте в браузере:
```
https://mixarx-signaling-server.onrender.com
```

Вы должны увидеть ошибку "Upgrade Required" - это нормально, значит сервер работает и ждет WebSocket подключения.

### Логи

Логи доступны в панели Render:
1. Откройте ваш сервис
2. Перейдите на вкладку "Logs"
3. Здесь вы увидите все подключения и сообщения

### Обновление кода

При каждом push в GitHub, Render автоматически пересобирает и деплоит сервер:

```bash
git add .
git commit -m "Update server"
git push
```

## Альтернативные платформы

Если Render не подходит, можно использовать:

- **Railway.app** - $5 бесплатных кредитов в месяц
- **Fly.io** - бесплатный тариф, не засыпает
- **Heroku** - платный (от $5/месяц)
- **VPS** (DigitalOcean, Linode) - от $4/месяц

## Поддержка

Если возникли проблемы:
1. Проверьте логи в Render
2. Убедитесь что используете `wss://` (не `ws://`)
3. Проверьте что сервер не спит (откройте URL в браузере)
