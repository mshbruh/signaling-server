# Changelog - Signaling Server

## Версия 1.1.0 - Исправления и улучшения

### Исправленные проблемы

#### 1. Улучшена обработка конфликтов username

**Было:**
- При попытке зарегистрировать занятый username сервер просто отклонял запрос
- Не проверялось, онлайн ли пир с этим username
- Не очищались username при отключении пира

**Стало:**
- Проверяется, онлайн ли пир с занятым username
- Если пир оффлайн, username освобождается автоматически
- При отключении пира его username удаляется из маппинга
- Поддержка смены username для существующего peer ID

**Код:**
```javascript
// Проверяем что username не занят ДРУГИМ пиром
const existingPeerId = usernameMap.get(username);
if (existingPeerId && existingPeerId !== peerId) {
  // Проверяем, онлайн ли пир с этим username
  const existingPeer = peers.get(existingPeerId);
  if (existingPeer && existingPeer.readyState === WebSocket.OPEN) {
    // Пир онлайн, username действительно занят
    ws.send(JSON.stringify({
      type: 'username-register-response',
      success: false,
      message: `Username @${username} уже занят другим активным пользователем`
    }));
    break;
  } else {
    // Пир оффлайн, освобождаем username
    usernameMap.delete(username);
    userProfiles.delete(existingPeerId);
  }
}
```

#### 2. Автоматическая очистка username при отключении

**Было:**
- Username оставался в маппинге после отключения пира
- Это приводило к "зомби" username, которые нельзя было использовать

**Стало:**
- При отключении пира автоматически удаляется его username
- Проверяется, что username действительно принадлежит этому peer ID

**Код:**
```javascript
ws.on('close', () => {
  if (currentPeerId) {
    peers.delete(currentPeerId);
    
    // Очищаем username маппинг при отключении
    const profile = userProfiles.get(currentPeerId);
    if (profile && profile.username) {
      if (usernameMap.get(profile.username) === currentPeerId) {
        usernameMap.delete(profile.username);
        console.log(`🗑️ Удален username: @${profile.username}`);
      }
    }
    userProfiles.delete(currentPeerId);
  }
});
```

#### 3. Поддержка смены username

**Было:**
- Нельзя было сменить username для существующего peer ID

**Стало:**
- При регистрации нового username для существующего peer ID старый username удаляется
- Логируется смена username

**Код:**
```javascript
// Если у этого peer ID уже был другой username, удаляем старый
const oldProfile = userProfiles.get(peerId);
if (oldProfile && oldProfile.username && oldProfile.username !== username) {
  console.log(`🔄 Peer ${peerId} меняет username: @${oldProfile.username} -> @${username}`);
  usernameMap.delete(oldProfile.username);
}
```

### Преимущества

1. **Нет бесконечных циклов переподключения** - если username занят активным пиром, клиент получает четкую ошибку
2. **Автоматическое освобождение username** - при отключении пира его username становится доступным
3. **Поддержка переподключения** - если пир переподключается с тем же username, конфликта не будет
4. **Поддержка смены username** - пир может сменить username без создания нового аккаунта

### Тестирование

Протестируйте следующие сценарии:

1. **Нормальная регистрация:**
   - Устройство A регистрирует @test → успех
   - Устройство B регистрирует @test2 → успех

2. **Конфликт с онлайн пиром:**
   - Устройство A регистрирует @test → успех
   - Устройство B пытается зарегистрировать @test → ошибка "Username уже занят"
   - Устройство B продолжает работать нормально (не отключается)

3. **Конфликт с оффлайн пиром:**
   - Устройство A регистрирует @test → успех
   - Устройство A отключается
   - Устройство B регистрирует @test → успех (username освобожден)

4. **Переподключение:**
   - Устройство A регистрирует @test → успех
   - Устройство A теряет соединение
   - Устройство A переподключается и регистрирует @test → успех

5. **Смена username:**
   - Устройство A регистрирует @test → успех
   - Устройство A регистрирует @test2 → успех
   - @test освобожден, @test2 занят

### Деплой

1. Закоммитьте изменения:
```bash
cd signaling-server
git add server.js CHANGELOG.md
git commit -m "fix: улучшена обработка конфликтов username и автоочистка"
git push
```

2. Render.com автоматически задеплоит изменения

3. Проверьте логи на Render.com Dashboard

### Совместимость

Изменения полностью обратно совместимы с существующими клиентами.
Клиенты получат улучшенную обработку ошибок без изменений в коде.

### Следующие шаги

Рекомендуется также обновить клиент для:
1. Показа более понятных сообщений об ошибках
2. Предложения альтернативных username при конфликте
3. Автоматической проверки доступности username перед регистрацией
