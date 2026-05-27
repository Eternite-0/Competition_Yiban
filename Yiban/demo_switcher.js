// demo_switcher.js - Floating Developer/Demo Controller for Yiban (易赛通) Prototype

(function () {
    // Wait for DOM to load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSwitcher);
    } else {
        initSwitcher();
    }

    function initSwitcher() {
        // Prevent duplicate loads
        if (document.getElementById("yiban-demo-switcher")) return;

        // Check active role to highlight
        const user = window.YibanDB ? window.YibanDB.getCurrentUser() : { role: "student", name: "张三" };
        const activeRole = user.role;

        // Create Container
        const container = document.createElement("div");
        container.id = "yiban-demo-switcher";
        container.className = "fixed bottom-5 right-5 z-[99999] flex flex-col items-end font-sans";
        
        // CSS Style Inject (Tailwind compatibility & custom animations)
        const style = document.createElement("style");
        style.textContent = `
            @keyframes float-pulse {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-4px) scale(1.05); }
            }
            .switcher-btn-float {
                animation: float-pulse 3s infinite ease-in-out;
            }
            .glass-panel {
                background: rgba(15, 23, 42, 0.95);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
        `;
        document.head.appendChild(style);

        // Define Screen list
        const screens = [
            { path: "index.html", title: "🧭 原型导航大地图 (Interactive Map)" },
            { path: "login.html", title: "🔑 登录页 (Login Page)" },
            { path: "student_home.html", title: "🎓 学生端首页 (Student Home)" },
            { path: "teacher_home.html", title: "🧑‍🏫 教师端首页 (Teacher Home)" },
            { path: "admin_home.html", title: "💼 管理员端首页 (Admin Home)" },
            { path: "competition_center.html", title: "🏆 赛事中心 (Competition Hub)" },
            { path: "competition_details.html", title: "📝 赛事详情 (Competition Details)" },
            { path: "team_recruitment.html", title: "🤝 组队招募中心 (Team Recruitment)" },
            { path: "registration_workbench.html", title: "✍️ 赛事报名工作台 (Register Workbench)" },
            { path: "my_registrations.html", title: "📂 我的赛事报名 (My Registrations)" },
            { path: "submission_upload.html", title: "📤 成果/作品上传 (Submission Upload)" },
            { path: "student_growth_portfolio.html", title: "📊 我的成长档案 (Growth Portfolio)" },
            { path: "teacher_competition_management.html", title: "📋 学生赛事管理 [教师] (Teach Competitions)" },
            { path: "teacher_growth_management.html", title: "📈 学生成长管理 [教师] (Teach Growth)" },
            { path: "submission_audit.html", title: "🔍 作品成果审核 [教师/管理员] (Audit Center)" },
            { path: "competition_publish.html", title: "📢 赛事发布与编辑 [管理员] (Publish Comp)" },
            { path: "excellent_works.html", title: "🌟 优秀作品管理 [管理员] (Excellent Works)" }
        ];

        // 1. Floating Toggle Button
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "switcher-btn-float w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20";
        toggleBtn.innerHTML = `<span class="material-symbols-outlined text-[26px]">dashboard_customize</span>`;
        container.appendChild(toggleBtn);

        // 2. Interactive Menu Drawer
        const drawer = document.createElement("div");
        drawer.className = "glass-panel hidden w-[320px] rounded-2xl p-5 mt-3 text-white shadow-2xl flex flex-col gap-4 transition-all duration-300 origin-bottom-right scale-95 opacity-0";
        
        // Header
        const header = document.createElement("div");
        header.className = "flex items-center justify-between border-b border-white/10 pb-3";
        header.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-indigo-400">explore</span>
                <span class="font-semibold text-[15px] tracking-wide">易赛通 原型演示盘</span>
            </div>
            <button id="switcher-close-btn" class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center">
                <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
        `;
        drawer.appendChild(header);

        // Active Status & Role Switcher
        const roleLabelMap = { student: "学生 (张三)", teacher: "教师 (王教授)", admin: "管理员 (Admin)" };
        const roleColorMap = { student: "bg-blue-500/20 text-blue-300 border-blue-500/30", teacher: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", admin: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
        
        const activeRoleCard = document.createElement("div");
        activeRoleCard.className = "flex flex-col gap-2 bg-white/5 rounded-xl p-3 border border-white/5";
        activeRoleCard.innerHTML = `
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>当前模拟用户</span>
                <span class="px-2 py-0.5 rounded-full border text-[10px] font-medium ${roleColorMap[activeRole] || 'bg-slate-500/20'}">${roleLabelMap[activeRole] || activeRole}</span>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
                <button data-role="student" class="role-switch-btn py-1.5 px-1 rounded-lg text-[11px] font-medium border text-center transition-all cursor-pointer ${activeRole === 'student' ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-inner' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white'}">
                    学生端
                </button>
                <button data-role="teacher" class="role-switch-btn py-1.5 px-1 rounded-lg text-[11px] font-medium border text-center transition-all cursor-pointer ${activeRole === 'teacher' ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-inner' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white'}">
                    教师端
                </button>
                <button data-role="admin" class="role-switch-btn py-1.5 px-1 rounded-lg text-[11px] font-medium border text-center transition-all cursor-pointer ${activeRole === 'admin' ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-inner' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white'}">
                    管理员
                </button>
            </div>
        `;
        drawer.appendChild(activeRoleCard);

        // Screen Selector
        const selectContainer = document.createElement("div");
        selectContainer.className = "flex flex-col gap-1.5";
        selectContainer.innerHTML = `
            <label class="text-xs text-slate-400">快速页面跳转</label>
            <select id="switcher-screen-select" class="w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer">
                <option value="" disabled selected>选择想要跳转的原型页面...</option>
                ${screens.map(scr => `<option value="${scr.path}">${scr.title}</option>`).join('')}
            </select>
        `;
        drawer.appendChild(selectContainer);

        // Screen Grid Quick Links (4 main pages)
        const quickGrid = document.createElement("div");
        quickGrid.className = "grid grid-cols-2 gap-2";
        const homepages = [
            { path: "student_home.html", title: "学生端首", icon: "school", color: "hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/30" },
            { path: "teacher_home.html", title: "教师端首", icon: "co_present", color: "hover:bg-emerald-600/20 hover:text-emerald-300 hover:border-emerald-500/30" },
            { path: "admin_home.html", title: "管理员首", icon: "admin_panel_settings", color: "hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/30" },
            { path: "competition_center.html", title: "赛事中心", icon: "emoji_events", color: "hover:bg-violet-600/20 hover:text-violet-300 hover:border-violet-500/30" }
        ];
        quickGrid.innerHTML = homepages.map(hp => `
            <a href="${hp.path}" class="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-[11px] font-medium text-slate-300 transition-all ${hp.color}">
                <span class="material-symbols-outlined text-[16px]">${hp.icon}</span>
                <span>${hp.title}</span>
            </a>
        `).join('');
        drawer.appendChild(quickGrid);

        // Actions (Reset & Guide Map)
        const actionsRow = document.createElement("div");
        actionsRow.className = "flex gap-2 border-t border-white/10 pt-3";
        
        const resetBtn = document.createElement("button");
        resetBtn.className = "flex-1 h-9 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-medium hover:bg-red-500/20 hover:text-red-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5";
        resetBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">restart_alt</span>重置模拟库`;
        
        const mapBtn = document.createElement("a");
        mapBtn.href = "index.html";
        mapBtn.className = "flex-1 h-9 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-1.5";
        mapBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">map</span>返回导航图`;

        actionsRow.appendChild(resetBtn);
        actionsRow.appendChild(mapBtn);
        drawer.appendChild(actionsRow);

        container.appendChild(drawer);
        document.body.appendChild(container);

        // 3. EVENT BINDINGS
        
        // Toggle Panel
        toggleBtn.addEventListener("click", () => {
            if (drawer.classList.contains("hidden")) {
                drawer.classList.remove("hidden");
                // Trigger transition
                setTimeout(() => {
                    drawer.classList.remove("scale-95", "opacity-0");
                    drawer.classList.add("scale-100", "opacity-100");
                }, 10);
                toggleBtn.classList.add("rotate-90");
            } else {
                closeDrawer();
            }
        });

        // Close button
        drawer.querySelector("#switcher-close-btn").addEventListener("click", closeDrawer);

        function closeDrawer() {
            drawer.classList.remove("scale-100", "opacity-100");
            drawer.classList.add("scale-95", "opacity-0");
            toggleBtn.classList.remove("rotate-90");
            setTimeout(() => {
                drawer.classList.add("hidden");
            }, 300);
        }

        // Dropdown Screen Select
        drawer.querySelector("#switcher-screen-select").addEventListener("change", (e) => {
            const page = e.target.value;
            if (page) {
                window.location.href = page;
            }
        });

        // Role Switch Buttons
        drawer.querySelectorAll(".role-switch-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const role = btn.getAttribute("data-role");
                let userObj = { role: role, name: "张三", id: "2023010421" };
                let targetUrl = "student_home.html";

                if (role === "teacher") {
                    userObj = { role: "teacher", name: "王教授", id: "T1004" };
                    targetUrl = "teacher_home.html";
                } else if (role === "admin") {
                    userObj = { role: "admin", name: "超级管理员", id: "A0001" };
                    targetUrl = "admin_home.html";
                }

                if (window.YibanDB) {
                    window.YibanDB.setCurrentUser(userObj);
                }

                // Show mini popup/toast inside switcher
                showMiniToast(`已成功切换到【${roleLabelMap[role]}】端，正在为您跳转...`, "success");

                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 800);
            });
        });

        // Reset Button Action
        resetBtn.addEventListener("click", () => {
            if (confirm("确定要重置所有模拟数据吗？这将会清空您的报名、成果上传以及审核记录。")) {
                if (window.YibanDB) {
                    window.YibanDB.resetDB();
                }
                showMiniToast("模拟数据库重置成功！", "success");
                setTimeout(() => {
                    window.location.reload();
                }, 800);
            }
        });

        // Custom Mini Toast within Switcher
        function showMiniToast(msg, type = "success") {
            const toast = document.createElement("div");
            toast.className = `fixed bottom-24 right-5 z-[100000] px-4 py-2.5 rounded-xl text-xs font-medium text-white shadow-lg border backdrop-blur-md transition-all duration-300 translate-y-3 opacity-0 ${type === 'success' ? 'bg-emerald-600/90 border-emerald-500/40 shadow-emerald-500/20' : 'bg-slate-800/90 border-slate-700/40'}`;
            toast.innerText = msg;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.remove("translate-y-3", "opacity-0");
            }, 10);

            setTimeout(() => {
                toast.classList.add("translate-y-3", "opacity-0");
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        }
    }
})();
