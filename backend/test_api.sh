#!/bin/bash
cd "$(dirname "$0")"

rm -f data/trial.db

node server.js &
SERVER_PID=$!
sleep 3

echo ""
echo "=============================="
echo "  教培试听转正系统 API 测试"
echo "=============================="

echo ""
echo "【场景1: 未到访拦截】"
echo "------------------------------"
TRIALS=$(curl -s http://localhost:3003/api/trials)
echo "$TRIALS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'共有 {len(data)} 条试听记录')
no_visit = [t for t in data if t['visit_status'] != 'visited']
visited = [t for t in data if t['visit_status'] == 'visited']
print(f'已到访: {len(visited)} 人')
print(f'未到访: {len(no_visit)} 人')
if no_visit:
    t = no_visit[0]
    print(f'测试学员: {t[\"student_name\"]} (状态: {t[\"visit_status\"]})')
"

echo ""
echo "【场景2: 报名资格检查 - 未到访学员】"
echo "------------------------------"
NO_VISIT_ID=$(echo "$TRIALS" | python3 -c "import sys,json; data=[t for t in json.load(sys.stdin) if t['visit_status']!='visited']; print(data[0]['id'] if data else '')")
COURSE_ID=$(curl -s http://localhost:3003/api/courses | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
if [ -n "$NO_VISIT_ID" ]; then
    RESULT=$(curl -s -X POST http://localhost:3003/api/enrollments/check \
        -H "Content-Type: application/json" \
        -d "{\"trial_id\": \"$NO_VISIT_ID\", \"course_id\": \"$COURSE_ID\"}")
    echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'可以报名: {data.get(\"can_enroll\", False)}')
if data.get('errors'):
    print('拦截原因:')
    for e in data['errors']:
        print(f'  ❌ {e}')
"
fi

echo ""
echo "【场景3: 满班候补】"
echo "------------------------------"
COURSES=$(curl -s http://localhost:3003/api/courses)
echo "$COURSES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
full_courses = [c for c in data if c['status'] == 'full']
active_courses = [c for c in data if c['status'] == 'active']
print(f'已满班课程: {len(full_courses)} 门')
for c in full_courses:
    print(f'  🚫 {c[\"name\"]} ({c[\"enrolled\"]}/{c[\"capacity\"]})')
print(f'有名额课程: {len(active_courses)} 门')
for c in active_courses:
    print(f'  ✅ {c[\"name\"]} ({c[\"enrolled\"]}/{c[\"capacity\"]})')
"

echo ""
echo "【场景4: 优惠券过期检查】"
echo "------------------------------"
COUPONS=$(curl -s http://localhost:3003/api/coupons)
echo "$COUPONS" | python3 -c "
import sys, json
from datetime import datetime
data = json.load(sys.stdin)
print(f'共有 {len(data)} 张优惠券')
expired = [c for c in data if c.get('status') == 'expired']
active = [c for c in data if c.get('status') == 'active']
print(f'有效: {len(active)} 张')
print(f'已过期: {len(expired)} 张')
for c in expired:
    print(f'  ⏰ {c[\"code\"]} - ¥{c[\"amount\"]} (过期: {c.get(\"expire_date\", \"N/A\")})')
for c in active[:2]:
    print(f'  ✅ {c[\"code\"]} - ¥{c[\"amount\"]} (有效期至: {c.get(\"expire_date\", \"N/A\")})')
"

echo ""
echo "【场景5: 候补排序】"
echo "------------------------------"
WAITLISTS=$(curl -s http://localhost:3003/api/waitlists)
echo "$WAITLISTS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'共有 {len(data)} 条候补记录')
for w in sorted(data, key=lambda x: x.get('sort_score', 0), reverse=True)[:5]:
    pos = w.get('position', '?')
    score = w.get('sort_score', 0)
    name = w.get('student_name', '?')
    course = w.get('course_name', '?')
    print(f'  第{pos}位: {name} - {course} (分数: {score})')
"

echo ""
echo "【场景6: 转正漏斗】"
echo "------------------------------"
FUNNEL=$(curl -s http://localhost:3003/api/dashboard/funnel)
echo "$FUNNEL" | python3 -c "
import sys, json
data = json.load(sys.stdin)
leads = data.get('leads', 0)
enrolled = data.get('enrolled', 0)
visited = data.get('visited', 0)
rate = (enrolled / leads * 100) if leads > 0 else 0
print(f'线索总数: {leads}')
print(f'预约试听: {data.get(\"trial_scheduled\", 0)}')
print(f'实际到访: {visited}')
print(f'完成反馈: {data.get(\"feedback_done\", 0)}')
print(f'正式报名: {enrolled}')
print(f'候补中: {data.get(\"waitlisted\", 0)}')
print(f'整体转化率: {rate:.1f}%')
"

echo ""
echo "=============================="
echo "  测试完成"
echo "=============================="

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
