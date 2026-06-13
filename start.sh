#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 启动教培试听转正系统..."
echo ""

echo "📦 启动后端服务..."
cd backend
rm -f data/trial.db
node server.js &
BACKEND_PID=$!
cd ..

sleep 2

echo "🎨 启动前端服务..."
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 系统启动完成！"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3003"
echo ""
echo "   后端PID: $BACKEND_PID"
echo "   前端PID: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait 2>/dev/null; echo '✅ 服务已停止'; exit 0" INT

wait
