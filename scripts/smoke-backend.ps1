# 易赛通后端冒烟测试
#
# 对着跑起来的后端打真实 HTTP，覆盖三端核心链路：
# 登录与权限边界 / 赛事发布与查询 / 报名 / 成果上传 / 统一工作台审核三态 /
# 学生数据权限 / 成长档案联动 / 站内消息 / 老审核端点向后兼容
#
# 用法（后端需已在 8080 跑起来）：
#   .\scripts\smoke-backend.ps1
#
# 会往库里写测试数据（赛事、报名、成果、消息），只在测试库上跑。
$ErrorActionPreference = 'Continue'
$BASE = 'http://localhost:8080/api'
$script:pass = 0; $script:fail = 0; $script:failed = @()

function Check($name, $cond, $detail) {
    if ($cond) { $script:pass++; Write-Host ("  [PASS] " + $name) -ForegroundColor Green }
    else { $script:fail++; $script:failed += $name; Write-Host ("  [FAIL] " + $name + " :: " + $detail) -ForegroundColor Red }
}

function Api($method, $path, $token, $body, $ctype) {
    $h = @{}
    if ($token) { $h['Authorization'] = "Bearer $token" }
    $p = @{ Uri = "$BASE$path"; Method = $method; Headers = $h; UseBasicParsing = $true; TimeoutSec = 25 }
    if ($null -ne $body) { $p['Body'] = $body; $p['ContentType'] = ($(if ($ctype) { $ctype } else { 'application/json; charset=utf-8' })) }
    try {
        $r = Invoke-WebRequest @p
        return @{ ok = $true; code = $r.StatusCode; json = ($r.Content | ConvertFrom-Json); raw = $r.Content }
    } catch {
        $sc = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $raw = ''
        try { $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); $raw = $sr.ReadToEnd() } catch {}
        $j = $null; try { $j = $raw | ConvertFrom-Json } catch {}
        return @{ ok = $false; code = $sc; json = $j; raw = $raw; err = $_.Exception.Message }
    }
}

function Login($u, $p) {
    $r = Api 'POST' '/auth/login' $null (@{ username = $u; password = $p } | ConvertTo-Json)
    if ($r.ok -and $r.json.code -eq 200) { return $r.json.data.token }
    Write-Host ("  !! 登录失败 " + $u + " :: " + $r.raw) -ForegroundColor Yellow
    return $null
}

Write-Host "`n=== 1. 认证 ===" -ForegroundColor Cyan
$admin = Login 'admin' '123456'
$teacher = Login 'teacher1' '123456'
$stu1 = Login '20230101' '123456'
Check '管理员登录' ($null -ne $admin) 'token 为空'
Check '教师登录' ($null -ne $teacher) 'token 为空'
Check '学生登录' ($null -ne $stu1) 'token 为空'

$bad = Api 'POST' '/auth/login' $null (@{ username = 'admin'; password = 'wrong' } | ConvertTo-Json)
Check '错误密码被拒绝' (-not ($bad.ok -and $bad.json.code -eq 200)) '错误密码竟然登录成功'

Write-Host "`n=== 2. 公共基础数据（匿名，修复的 401 bug）===" -ForegroundColor Cyan
$meta = Api 'GET' '/meta/colleges' $null $null
Check '匿名可取学院列表' ($meta.ok -and $meta.json.data.Count -gt 0) "code=$($meta.code)"
$metaM = Api 'GET' '/meta/majors' $null $null
Check '匿名可取专业列表' ($metaM.ok) "code=$($metaM.code)"

Write-Host "`n=== 3. 赛事查询（三端）===" -ForegroundColor Cyan
$cs = Api 'GET' '/competition/list?current=1&size=5' $stu1 $null
Check '学生查赛事列表' ($cs.ok -and $cs.json.code -eq 200) "code=$($cs.code)"
$stuSeesOnlyPublished = $true
foreach ($c in $cs.json.data.records) { if ($c.status -ne 'published') { $stuSeesOnlyPublished = $false } }
Check '学生只看到已发布赛事' $stuSeesOnlyPublished '出现了非 published 赛事'

$ct = Api 'GET' '/competition/list?current=1&size=5' $teacher $null
Check '教师查赛事列表' ($ct.ok -and $ct.json.code -eq 200) "code=$($ct.code)"
$ca = Api 'GET' '/competition/list?current=1&size=100' $admin $null
Check '管理员查赛事列表' ($ca.ok -and $ca.json.code -eq 200) "code=$($ca.code)"

$pubComp = $cs.json.data.records | Select-Object -First 1
if ($pubComp) {
    $cd = Api 'GET' "/competition/detail/$($pubComp.id)" $stu1 $null
    Check '赛事详情可读' ($cd.ok -and $cd.json.data.name) "code=$($cd.code)"
    Check '赛事详情含阶段字段' ($null -ne $cd.json.data.PSObject.Properties['stages']) '缺 stages'
}

Write-Host "`n=== 4. 管理员发布赛事（走统一发布通道）===" -ForegroundColor Cyan
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$newComp = @{
    name = "冒烟测试赛事_$stamp"; level = '校级'; category = 'A'; organizer = '冒烟测试'
    startTime = '2026-01-01 00:00:00'; endTime = '2026-12-31 23:59:59'
    competitionStart = '2026-06-01 00:00:00'; competitionEnd = '2026-06-02 00:00:00'
    maxTeamSize = 3; content = '<p>冒烟</p>'; tags = @('测试'); tracks = @('赛道A')
} | ConvertTo-Json
$created = Api 'POST' '/competition/admin/publish' $admin $newComp
Check '发布赛事成功' ($created.ok -and $created.json.code -eq 200) $created.raw
$compId = $created.json.data.id
Check '默认状态为 published' ($created.json.data.status -eq 'published') "status=$($created.json.data.status)"
Check 'tags 落库为 JSON 数组' ($created.json.data.tags -is [array]) "tags=$($created.json.data.tags)"

# 校验现在在服务层执行
$badComp = @{ name = '   '; level = '校级'; category = 'A'; startTime = '2026-01-01 00:00:00'; endTime = '2026-12-31 00:00:00'; maxTeamSize = 1 } | ConvertTo-Json
$rej = Api 'POST' '/competition/admin/publish' $admin $badComp
Check '空名称被拒绝' (-not ($rej.ok -and $rej.json.code -eq 200)) '空名称竟然通过'

$badSize = @{ name = "冒烟_人数非法_$stamp"; level = '校级'; category = 'A'; startTime = '2026-01-01 00:00:00'; endTime = '2026-12-31 00:00:00'; maxTeamSize = 0 } | ConvertTo-Json
$rej2 = Api 'POST' '/competition/admin/publish' $admin $badSize
Check '团队人数 0 被拒绝' (-not ($rej2.ok -and $rej2.json.code -eq 200)) '非法人数竟然通过'

Write-Host "`n=== 5. 权限边界 ===" -ForegroundColor Cyan
$stuPub = Api 'POST' '/competition/admin/publish' $stu1 $newComp
Check '学生不能发布赛事' (-not ($stuPub.ok -and $stuPub.json.code -eq 200)) "code=$($stuPub.code)"
$noAuth = Api 'GET' '/registration/my' $null $null
Check '未登录不能读我的报名' (-not ($noAuth.ok -and $noAuth.json.code -eq 200)) "code=$($noAuth.code)"
$stuPending = Api 'GET' '/admin/workbench/tasks?current=1&size=5' $stu1 $null
Check '学生不能读管理员工作台' (-not ($stuPending.ok -and $stuPending.json.code -eq 200)) "code=$($stuPending.code)"

Write-Host "`n=== 6. 学生报名 ===" -ForegroundColor Cyan
$reg = Api 'POST' '/registration/submit' $stu1 (@{ competitionId = $compId; teamName = "冒烟队_$stamp"; track = '赛道A' } | ConvertTo-Json)
Check '学生报名成功' ($reg.ok -and $reg.json.code -eq 200) $reg.raw
$regId = $reg.json.data.id
Check '报名初始状态为已提交' ($reg.json.data.status -eq '已提交') "status=$($reg.json.data.status)"

$dup = Api 'POST' '/registration/submit' $stu1 (@{ competitionId = $compId; teamName = '重复'; track = '赛道A' } | ConvertTo-Json)
Check '重复报名被拒绝' (-not ($dup.ok -and $dup.json.code -eq 200)) '重复报名竟然成功'

$badTrack = Api 'POST' '/registration/submit' $stu1 (@{ competitionId = $compId; teamName = 'x'; track = '不存在的赛道' } | ConvertTo-Json)
Check '非法赛道被拒绝' (-not ($badTrack.ok -and $badTrack.json.code -eq 200)) '非法赛道竟然通过'

$my = Api 'GET' '/registration/my' $stu1 $null
Check '我的报名可读' ($my.ok -and ($my.json.data | Where-Object { $_.id -eq $regId })) '新报名不在列表里'

Write-Host "`n=== 7. 统一工作台：报名待办 ===" -ForegroundColor Cyan
$tasks = Api 'GET' '/admin/workbench/tasks?current=1&size=200&status=pending' $admin $null
Check '管理员待办列表可读' ($tasks.ok -and $tasks.json.code -eq 200) $tasks.raw
$regTask = $tasks.json.data.records | Where-Object { $_.targetType -eq 'registration' -and $_.targetId -eq $regId } | Select-Object -First 1
Check '报名自动生成待办' ($null -ne $regTask) "未找到 targetId=$regId 的待办"

$stats = Api 'GET' '/admin/workbench/stats' $admin $null
Check '待办统计可读' ($stats.ok -and $null -ne $stats.json.data.pending) $stats.raw

$tstats = Api 'GET' '/teacher/workbench/stats' $teacher $null
Check '教师工作台统计可读（合并后的孪生类）' ($tstats.ok -and $tstats.json.code -eq 200) $tstats.raw
$ttasks = Api 'GET' '/teacher/workbench/tasks?current=1&size=5' $teacher $null
Check '教师工作台列表可读' ($ttasks.ok -and $ttasks.json.code -eq 200) $ttasks.raw

Write-Host "`n=== 8. 审核动作三态（退回补充是独立状态）===" -ForegroundColor Cyan
# 无意见驳回应被拒绝
$noNote = Api 'POST' "/admin/workbench/tasks/$($regTask.id)/action" $admin (@{ action = 'reject'; reviewNote = '' } | ConvertTo-Json)
Check '驳回不填意见被拒绝' (-not ($noNote.ok -and $noNote.json.code -eq 200)) '空意见驳回竟然通过'

# 退回补充
$ret = Api 'POST' "/admin/workbench/tasks/$($regTask.id)/action" $admin (@{ action = 'return'; reviewNote = '请补充指导老师信息' } | ConvertTo-Json)
Check '退回补充成功' ($ret.ok -and $ret.json.code -eq 200) $ret.raw
$my2 = Api 'GET' '/registration/my' $stu1 $null
$r2 = $my2.json.data | Where-Object { $_.id -eq $regId }
Check '报名状态变为退回补充' ($r2.status -eq '退回补充') "status=$($r2.status)"
Check '审核意见不含内部前缀' ($r2.reviewNote -notlike '*【退回补充】*') "note=$($r2.reviewNote)"
Check '审核意见保留教师原话' ($r2.reviewNote -like '*指导老师*') "note=$($r2.reviewNote)"

$doneTask = Api 'POST' "/admin/workbench/tasks/$($regTask.id)/action" $admin (@{ action = 'approve' } | ConvertTo-Json)
Check '已处理待办不能重复处理' (-not ($doneTask.ok -and $doneTask.json.code -eq 200)) '重复处理竟然成功'

Write-Host "`n=== 9. 退回后重新报名 + 成果上传 ===" -ForegroundColor Cyan
$reg2 = Api 'POST' '/registration/submit' $stu1 (@{ competitionId = $compId; teamName = "冒烟队2_$stamp"; track = '赛道A' } | ConvertTo-Json)
Check '退回补充后可重新报名' ($reg2.ok -and $reg2.json.code -eq 200) $reg2.raw
$regId2 = $reg2.json.data.id

$sub = Api 'POST' "/submission/submit?registrationId=$regId2&fileName=smoke.pdf&fileUrl=/api/file/serve/smoke.pdf&fileSize=1024" $stu1 $null
Check '成果上传成功' ($sub.ok -and $sub.json.code -eq 200) $sub.raw
$subId = $sub.json.data.id

$my3 = Api 'GET' '/registration/my' $stu1 $null
$r3 = $my3.json.data | Where-Object { $_.id -eq $regId2 }
Check '上传成果后报名转为审核中' ($r3.status -eq '审核中') "status=$($r3.status)"

$extUrl = Api 'POST' "/submission/submit?registrationId=$regId2&fileName=x.pdf&fileUrl=https://evil.example.com/x.pdf&fileSize=1" $stu1 $null
Check '外部文件链接被拒绝' (-not ($extUrl.ok -and $extUrl.json.code -eq 200)) '外部链接竟然通过'

Write-Host "`n=== 10. 成果审核：退回补充（曾必定 500 的 NPE）===" -ForegroundColor Cyan
$tasks2 = Api 'GET' '/admin/workbench/tasks?current=1&size=200&status=pending' $admin $null
$subTask = $tasks2.json.data.records | Where-Object { $_.targetType -eq 'submission' -and $_.targetId -eq $subId } | Select-Object -First 1
Check '成果自动生成待办' ($null -ne $subTask) "未找到 submission 待办 targetId=$subId"

$subRet = Api 'POST' "/admin/workbench/tasks/$($subTask.id)/action" $admin (@{ action = 'return'; reviewNote = '请补充答辩材料' } | ConvertTo-Json)
Check '成果退回补充不再 500' ($subRet.ok -and $subRet.json.code -eq 200) "code=$($subRet.code) raw=$($subRet.raw)"

$mySub = Api 'GET' '/submission/my' $stu1 $null
$s1 = $mySub.json.data | Where-Object { $_.id -eq $subId }
Check '成果状态为已审核' ($s1.status -eq '已审核') "status=$($s1.status)"
Check '退回补充时 approved 保持未定' ($null -eq $s1.approved) "approved=$($s1.approved)"

$my4 = Api 'GET' '/registration/my' $stu1 $null
$r4 = $my4.json.data | Where-Object { $_.id -eq $regId2 }
Check '成果退回联动报名为退回补充' ($r4.status -eq '退回补充') "status=$($r4.status)"

Write-Host "`n=== 11. 审核通过全链路 + 成长档案联动 ===" -ForegroundColor Cyan
$reg3 = Api 'POST' '/registration/submit' $stu1 (@{ competitionId = $compId; teamName = "冒烟队3_$stamp"; track = '赛道A' } | ConvertTo-Json)
$regId3 = $reg3.json.data.id
$sub3 = Api 'POST' "/submission/submit?registrationId=$regId3&fileName=ok.pdf&fileUrl=/api/file/serve/ok.pdf&fileSize=2048" $stu1 $null
$subId3 = $sub3.json.data.id

$growthBefore = Api 'GET' '/growth/radar' $stu1 $null
$awardsBefore = $growthBefore.json.data.awards

$tasks3 = Api 'GET' '/admin/workbench/tasks?current=1&size=200&status=pending' $admin $null
$subTask3 = $tasks3.json.data.records | Where-Object { $_.targetType -eq 'submission' -and $_.targetId -eq $subId3 } | Select-Object -First 1
$ok = Api 'POST' "/admin/workbench/tasks/$($subTask3.id)/action" $admin (@{ action = 'approve'; reviewNote = '作品优秀' } | ConvertTo-Json)
Check '成果审核通过' ($ok.ok -and $ok.json.code -eq 200) $ok.raw

$my5 = Api 'GET' '/registration/my' $stu1 $null
$r5 = $my5.json.data | Where-Object { $_.id -eq $regId3 }
Check '审核通过联动报名为审核通过' ($r5.status -eq '审核通过') "status=$($r5.status)"

$growthAfter = Api 'GET' '/growth/radar' $stu1 $null
Check '成长档案获奖数增加' ($growthAfter.json.data.awards -gt $awardsBefore) "before=$awardsBefore after=$($growthAfter.json.data.awards)"

# 关联报名的待办应一并结掉，不留孤儿
$tasksAfter = Api 'GET' '/admin/workbench/tasks?current=1&size=200&status=pending' $admin $null
$orphan = $tasksAfter.json.data.records | Where-Object { $_.targetType -eq 'registration' -and $_.targetId -eq $regId3 }
Check '关联报名待办已同步结案（无孤儿）' ($null -eq $orphan) "仍有 pending 报名待办 targetId=$regId3"

Write-Host "`n=== 12. 学生数据权限（StudentAccessPolicy）===" -ForegroundColor Cyan
$selfRadar = Api 'GET' '/growth/radar' $stu1 $null
Check '学生可看自己的成长档案' ($selfRadar.ok -and $selfRadar.json.code -eq 200) $selfRadar.raw
$otherRadar = Api 'GET' '/growth/radar?studentId=999999' $stu1 $null
Check '学生不能看他人成长档案' (-not ($otherRadar.ok -and $otherRadar.json.code -eq 200)) "code=$($otherRadar.code)"

$tStudents = Api 'GET' '/teacher/students?current=1&size=5' $teacher $null
Check '教师可查学生列表' ($tStudents.ok -and $tStudents.json.code -eq 200) $tStudents.raw
$tColleges = Api 'GET' '/teacher/colleges' $teacher $null
Check '教师学院列表可读' ($tColleges.ok -and $tColleges.json.code -eq 200) $tColleges.raw

$overview = Api 'GET' '/teacher/college-overview' $teacher $null
Check '学院总览可读（含聚合改写）' ($overview.ok -and $overview.json.code -eq 200) $overview.raw
$dash = Api 'GET' '/teacher/dashboard' $teacher $null
Check '教师工作台数据可读' ($dash.ok -and $dash.json.code -eq 200) $dash.raw

Write-Host "`n=== 13. 老审核端点向后兼容（前端仍在用）===" -ForegroundColor Cyan
# 上一条报名已审核通过，同一赛事不能再报（去重只放行驳回/退回补充后的重报），
# 所以这里另开一个赛事
$comp2Body = @{
    name = "冒烟测试赛事2_$stamp"; level = '校级'; category = 'A'; organizer = '冒烟测试'
    startTime = '2026-01-01 00:00:00'; endTime = '2026-12-31 23:59:59'
    maxTeamSize = 3; content = '<p>冒烟2</p>'; tags = @('测试'); tracks = @('赛道A')
} | ConvertTo-Json
$comp2 = Api 'POST' '/competition/admin/publish' $admin $comp2Body
$compId2 = $comp2.json.data.id
Check '第二个赛事发布成功' ($null -ne $compId2) $comp2.raw
$reg4 = Api 'POST' '/registration/submit' $stu1 (@{ competitionId = $compId2; teamName = "冒烟队4_$stamp"; track = '赛道A' } | ConvertTo-Json)
Check '第二个赛事报名成功' ($reg4.ok -and $reg4.json.code -eq 200) $reg4.raw
$regId4 = $reg4.json.data.id
# 旧格式：approve=false + 【退回补充】前缀
$legacy = Api 'POST' "/registration/audit?registrationId=$regId4" $admin (@{ approve = $false; reviewNote = '【退回补充】旧格式调用' } | ConvertTo-Json)
Check '旧审核端点仍可用' ($legacy.ok -and $legacy.json.code -eq 200) $legacy.raw
$my6 = Api 'GET' '/registration/my' $stu1 $null
$r6 = $my6.json.data | Where-Object { $_.id -eq $regId4 }
Check '旧格式前缀仍被识别为退回补充' ($r6.status -eq '退回补充') "status=$($r6.status)"
Check '旧格式意见也被剥离前缀' ($r6.reviewNote -notlike '*【退回补充】*') "note=$($r6.reviewNote)"

Write-Host "`n=== 14. 其他核心只读端点 ===" -ForegroundColor Cyan
foreach ($ep in @(
    @{ p = '/message/list'; t = $stu1; n = '站内消息' },
    @{ p = '/team/list'; t = $stu1; n = '组队招募' },
    @{ p = '/activities'; t = $stu1; n = '活动列表' },
    @{ p = '/me/participations'; t = $stu1; n = '我的参与' },
    @{ p = '/growth/profile'; t = $stu1; n = '成长画像' },
    @{ p = '/growth/timeline'; t = $stu1; n = '成长时间轴' },
    @{ p = '/submission/excellent'; t = $stu1; n = '优秀作品' },
    @{ p = '/admin/users?current=1&size=5'; t = $admin; n = '用户管理' },
    @{ p = '/announcement/list'; t = $stu1; n = '公告列表' }
)) {
    $r = Api 'GET' $ep.p $ep.t $null
    Check "$($ep.n) 可读" ($r.ok -and $r.json.code -eq 200) "code=$($r.code) $($r.raw)"
}

Write-Host "`n=== 15. 审核通过后的消息通知 ===" -ForegroundColor Cyan
$msgs = Api 'GET' '/message/list' $stu1 $null
# 该端点返回分页对象
$records = if ($msgs.json.data.records) { $msgs.json.data.records } else { $msgs.json.data }
$retMsg = $records | Where-Object { $_.title -like '*补充*' } | Select-Object -First 1
$okMsg = $records | Where-Object { $_.title -like '*通过*' } | Select-Object -First 1
Check '退回补充产生站内消息' ($null -ne $retMsg) '未找到退回类消息'
Check '审核通过产生站内消息' ($null -ne $okMsg) '未找到通过类消息'
Check '消息正文不含内部前缀' ($retMsg -and $retMsg.content -notlike '*【退回补充】*') "content=$($retMsg.content)"
Check '消息正文保留教师原话' ($retMsg -and $retMsg.content -like '*指导老师*' -or $retMsg.content -like '*答辩*') "content=$($retMsg.content)"

Write-Host "`n========== 结果 ==========" -ForegroundColor Cyan
Write-Host ("通过 " + $script:pass + " / 失败 " + $script:fail)
if ($script:fail -gt 0) { Write-Host "`n失败项:" -ForegroundColor Red; $script:failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red } }
