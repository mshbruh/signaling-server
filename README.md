# MIXArx Signaling Server

WebSocket сервер для координации P2P соединений в MIXArx мессенджере.

## Локальный запуск

```bash
npm install
npm start
```

Сервер запустится на порту 8080.

## Деплой на Render.com

### Шаг 1: Подготовка репозитория
1. Создайте GitHub репозиторий
2. Загрузите папку `signaling-server` в репозиторий

### Шаг 2: Деплой на Render
1. Зарегистрируйтесь на [Render.com](https://render.com)
2. Нажмите "New +" → "Web Service"
3. Подключите ваш GitHub репозиторий
4. Настройки:
   - **Name**: mixarx-signaling-server (или любое имя)
   - **Root Directory**: `signaling-server` (если сервер в подпапке)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Нажмите "Create Web Service"

### Шаг 3: Получение URL
После деплоя вы получите URL вида: `https://mixarx-signaling-server.onrender.com`

Для WebSocket подключения используйте: `wss://mixarx-signaling-server.onrender.com`

⚠️ **Важно**: На бесплатном тарифе сервер засыпает после 15 минут неактивности. Первое подключение может занять 30-60 секунд.

## Использование

### Локально (тестирование)
```
ws://localhost:8080
```

### В локальной сети
Узнайте свой IP адрес:
- Windows: `ipconfig`
- Linux/Mac: `ifconfig`

Используйте:
```
ws://YOUR_IP:8080
```

### Через интернет (Render)
```
wss://your-service.onrender.com
```

## Протокол

### Регистрация
```json
{
  "type": "register",
  "peerId": "peer_123456"
}
```

### WebRTC Signaling
```json
{
  "type": "offer|answer|ice-candidate",
  "from": "peer_123456",
  "to": "peer_789012",
  "data": { ... }
}
```

### Проверка доступности пира
```json
{
  "type": "ping",
  "from": "peer_123456",
  "to": "peer_789012"
}
```

### Регистрация username
```json
{
  "type": "username-register",
  "peerId": "peer_123456",
  "username": "myusername",
  "name": "My Name"
}
```

## Переменные окружения

- `PORT` - порт сервера (по умолчанию 8080, автоматически устанавливается Render)
- `NODE_ENV` - окружение (production/development)
