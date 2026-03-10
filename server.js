const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Хранилище подключенных пиров: peerId -> WebSocket
const peers = new Map();

// Хранилище username -> peerId маппинга
const usernameMap = new Map();

// Хранилище peerId -> {username, name}
const userProfiles = new Map();

console.log(`🚀 MIXArx Signaling Server запущен на порту ${PORT}`);

wss.on('connection', (ws) => {
  let currentPeerId = null;
  let heartbeatInterval = null;

  console.log('✅ Новое подключение');
  
  // Запускаем heartbeat каждые 30 секунд для поддержания соединения
  heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now()
      }));
    }
  }, 30000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Получено:', data.type, 'от', data.from || currentPeerId);

      switch (data.type) {
        case 'register':
          // Регистрация пира
          const newPeerId = data.peerId;
          
          // Если этот peer ID уже зарегистрирован на другом соединении, закрываем старое
          if (peers.has(newPeerId) && peers.get(newPeerId) !== ws) {
            console.log(`⚠️  Peer ID ${newPeerId} уже зарегистрирован, закрываем старое соединение`);
            const oldWs = peers.get(newPeerId);
            oldWs.close();
            peers.delete(newPeerId);
          }
          
          // Если это соединение уже было зарегистрировано под другим peer ID, удаляем старую регистрацию
          if (currentPeerId && currentPeerId !== newPeerId) {
            console.log(`⚠️  Соединение перерегистрируется: ${currentPeerId} -> ${newPeerId}`);
            peers.delete(currentPeerId);
          }
          
          currentPeerId = newPeerId;
          peers.set(currentPeerId, ws);
          console.log(`👤 Зарегистрирован пир: ${currentPeerId}`);
          console.log(`📊 Всего пиров онлайн: ${peers.size}`);
          
          ws.send(JSON.stringify({
            type: 'registered',
            peerId: currentPeerId,
            success: true
          }));
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
        case 'audio-call':
        case 'video-call':
        case 'call-ended':
          // Временно отключаем валидацию для отладки
          // TODO: Вернуть валидацию после исправления проблемы с переподключением
          /*
          if (data.from !== currentPeerId) {
            console.log(`❌ Попытка подделки отправителя: ${data.from} != ${currentPeerId}`);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid sender identity'
            }));
            break;
          }
          */
          
          // Пересылка WebRTC signaling сообщений и сигналов о звонках
          const targetPeer = peers.get(data.to);
          
          if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
            targetPeer.send(JSON.stringify({
              type: data.type,
              from: data.from,
              to: data.to,
              data: data.data,
              callerName: data.callerName,
              callerUsername: data.callerUsername,
            }));
            console.log(`✉️  Переслано ${data.type}: ${data.from} -> ${data.to}`);
          } else {
            console.log(`❌ Пир ${data.to} не найден или оффлайн`);
            ws.send(JSON.stringify({
              type: 'error',
              message: `Пир ${data.to} не в сети`
            }));
          }
          break;

        case 'ping':
          // Проверка соединения
          console.log(`🏓 Ping от ${data.from} к ${data.to}`);
          const remotePeer = peers.get(data.to);
          if (remotePeer && remotePeer.readyState === WebSocket.OPEN) {
            console.log(`✅ Пир ${data.to} онлайн, отправляем pong`);
            ws.send(JSON.stringify({
              type: 'pong',
              from: data.to,
              peerId: data.to,
              online: true
            }));
          } else {
            console.log(`❌ Пир ${data.to} оффлайн`);
            ws.send(JSON.stringify({
              type: 'pong',
              from: data.to,
              peerId: data.to,
              online: false
            }));
          }
          break;

        case 'keep-alive':
          // Keep-alive от клиента для предотвращения засыпания сервера
          console.log(`💓 Keep-alive от ${data.peerId || currentPeerId} (timestamp: ${data.timestamp})`);
          ws.send(JSON.stringify({
            type: 'keep-alive-ack',
            timestamp: Date.now(),
            serverTime: new Date().toISOString()
          }));
          break;

        case 'username-register':
          // Регистрация username
          const { peerId, username, name } = data;
          
          if (!peerId || !username) {
            ws.send(JSON.stringify({
              type: 'username-register-response',
              success: false,
              message: 'peerId и username обязательны'
            }));
            break;
          }

          // ИСПРАВЛЕНО: Проверяем что username не занят ДРУГИМ пиром
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
              console.log(`❌ Username @${username} уже занят пиром ${existingPeerId}`);
              break;
            } else {
              // Пир оффлайн, освобождаем username
              console.log(`🔄 Username @${username} был занят оффлайн пиром ${existingPeerId}, освобождаем`);
              usernameMap.delete(username);
              userProfiles.delete(existingPeerId);
            }
          }

          // ИСПРАВЛЕНО: Если у этого peer ID уже был другой username, удаляем старый
          const oldProfile = userProfiles.get(peerId);
          if (oldProfile && oldProfile.username && oldProfile.username !== username) {
            console.log(`🔄 Peer ${peerId} меняет username: @${oldProfile.username} -> @${username}`);
            usernameMap.delete(oldProfile.username);
          }

          // Регистрируем
          usernameMap.set(username, peerId);
          userProfiles.set(peerId, { username, name });
          
          ws.send(JSON.stringify({
            type: 'username-register-response',
            success: true,
            message: 'Username зарегистрирован'
          }));
          
          console.log(`✅ Зарегистрирован username: @${username} -> ${peerId}`);
          console.log(`📊 Всего username: ${usernameMap.size}`);
          break;

        case 'username-resolve':
          // Резолв username -> peerId
          const requestedUsername = data.username;
          const resolvedPeerId = usernameMap.get(requestedUsername);
          
          ws.send(JSON.stringify({
            type: 'username-resolve-response',
            username: requestedUsername,
            peerId: resolvedPeerId || null
          }));
          
          console.log(`🔍 Резолв @${requestedUsername} -> ${resolvedPeerId || 'не найден'}`);
          break;

        case 'user-info-request':
          // Получение полной информации о пользователе
          const reqUsername = data.username;
          const userPeerId = usernameMap.get(reqUsername);
          const userProfile = userPeerId ? userProfiles.get(userPeerId) : null;
          
          if (userProfile) {
            ws.send(JSON.stringify({
              type: 'user-info-response',
              found: true,
              username: reqUsername,
              peerId: userPeerId,
              name: userProfile.name
            }));
            console.log(`📋 Информация о @${reqUsername}: ${userProfile.name}`);
          } else {
            ws.send(JSON.stringify({
              type: 'user-info-response',
              found: false,
              username: reqUsername
            }));
            console.log(`❌ Пользователь @${reqUsername} не найден`);
          }
          break;

        default:
          console.log('⚠️  Неизвестный тип сообщения:', data.type);
      }
    } catch (error) {
      console.error('❌ Ошибка обработки сообщения:', error);
    }
  });

  ws.on('close', () => {
    // Останавливаем heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    if (currentPeerId) {
      peers.delete(currentPeerId);
      
      // ИСПРАВЛЕНО: Очищаем username маппинг при отключении
      const profile = userProfiles.get(currentPeerId);
      if (profile && profile.username) {
        // Удаляем username только если он принадлежит этому peer ID
        if (usernameMap.get(profile.username) === currentPeerId) {
          usernameMap.delete(profile.username);
          console.log(`🗑️ Удален username: @${profile.username}`);
        }
      }
      userProfiles.delete(currentPeerId);
      
      console.log(`👋 Пир отключился: ${currentPeerId}`);
      console.log(`📊 Осталось пиров: ${peers.size}`);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Ошибка WebSocket:', error);
  });
});

console.log('');
console.log('📱 Для подключения используйте:');
console.log(`   ws://localhost:${PORT}`);
console.log(`   ws://YOUR_IP:${PORT}`);
console.log('');
