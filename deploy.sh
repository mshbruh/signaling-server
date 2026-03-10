#!/bin/bash

# Скрипт для деплоя signaling сервера на Render.com

echo "🚀 Деплой Signaling Server"
echo ""

# Проверяем что мы в правильной директории
if [ ! -f "server.js" ]; then
    echo "❌ Ошибка: server.js не найден"
    echo "Запустите скрипт из директории signaling-server"
    exit 1
fi

# Проверяем git статус
echo "📊 Проверка git статуса..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Есть незакоммиченные изменения:"
    git status --short
    echo ""
    read -p "Хотите закоммитить изменения? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📝 Введите сообщение коммита:"
        read commit_message
        git add .
        git commit -m "$commit_message"
        echo "✅ Изменения закоммичены"
    else
        echo "⚠️  Продолжаем без коммита"
    fi
fi

# Пушим на GitHub
echo ""
echo "📤 Отправка на GitHub..."
git push

if [ $? -eq 0 ]; then
    echo "✅ Изменения отправлены на GitHub"
    echo ""
    echo "🎉 Деплой запущен!"
    echo ""
    echo "Render.com автоматически задеплоит изменения."
    echo "Проверьте статус на: https://dashboard.render.com"
    echo ""
    echo "Логи будут доступны через несколько минут."
else
    echo "❌ Ошибка при отправке на GitHub"
    exit 1
fi
