// shared_state.js - Simulated LocalStorage Database for Yiban (易赛通) Interactive Prototype

(function () {
    const DEFAULT_COMPETITIONS = [
        { id: "comp_1", name: "第七届大学生智能车大赛", category: "工科电子", level: "省级", status: "报名中", date: "2026-06-15" },
        { id: "comp_2", name: "“挑战杯”大学生课外学术科技作品竞赛", category: "综合学术", level: "国家级", status: "已结束", date: "2026-04-10" },
        { id: "comp_3", name: "第十届数学建模联合邀请赛", category: "基础科学", level: "校级", status: "预热中", date: "2026-09-01" },
        { id: "comp_4", name: "全国大学生广告艺术大赛", category: "文商设计", level: "国家级", status: "报名中", date: "2026-07-20" }
    ];

    const DEFAULT_REGISTRATIONS = [
        {
            id: "reg_1",
            compId: "comp_1",
            compName: "第七届大学生智能车大赛",
            role: "组长",
            teamName: "阿尔法先锋队",
            members: "张三(学长), 李四, 王五",
            status: "待提交成果", // '待提交成果', '待审核', '已审核通过', '已驳回'
            regTime: "2026-05-20 14:32",
            submissionFile: null,
            submissionTime: null,
            auditFeedback: null
        },
        {
            id: "reg_2",
            compId: "comp_2",
            compName: "“挑战杯”大学生课外学术科技作品竞赛",
            role: "队员",
            teamName: "碳中和研究小组",
            members: "赵六(组长), 张三, 孙七",
            status: "已审核通过",
            regTime: "2026-03-12 09:15",
            submissionFile: "挑战杯学术论文_碳中和.pdf",
            submissionTime: "2026-03-25 18:00",
            auditFeedback: "作品选题宏大，论证严密，获得省一等奖推荐。"
        }
    ];

    const DEFAULT_AUDITS = [
        {
            id: "audit_1",
            studentName: "张三",
            studentId: "2023010421",
            compName: "“挑战杯”课外学术科技作品竞赛",
            teamName: "碳中和研究小组",
            fileName: "挑战杯学术论文_碳中和.pdf",
            submitTime: "2026-03-25 18:00",
            status: "已审核"
        }
    ];

    // Initialize Database in LocalStorage
    function initDB() {
        if (!localStorage.getItem("yiban_db_initialized")) {
            localStorage.setItem("yiban_competitions", JSON.stringify(DEFAULT_COMPETITIONS));
            localStorage.setItem("yiban_registrations", JSON.stringify(DEFAULT_REGISTRATIONS));
            localStorage.setItem("yiban_audits", JSON.stringify(DEFAULT_AUDITS));
            localStorage.setItem("yiban_current_user", JSON.stringify({ role: "student", name: "张三", id: "2023010421" }));
            localStorage.setItem("yiban_db_initialized", "true");
            console.log("Simulated DB Initialized!");
        }
    }

    initDB();

    // Global APIs to interact with local storage
    window.YibanDB = {
        getCompetitions: () => JSON.parse(localStorage.getItem("yiban_competitions")),
        getRegistrations: () => JSON.parse(localStorage.getItem("yiban_registrations")),
        getAudits: () => JSON.parse(localStorage.getItem("yiban_audits")),
        getCurrentUser: () => JSON.parse(localStorage.getItem("yiban_current_user")),
        
        setCurrentUser: (user) => {
            localStorage.setItem("yiban_current_user", JSON.stringify(user));
            console.log("Current user set:", user);
        },

        addRegistration: (regData) => {
            const regs = YibanDB.getRegistrations();
            const newReg = {
                id: "reg_" + Date.now(),
                compId: regData.compId || "comp_custom",
                compName: regData.compName || "未命名赛事",
                role: regData.role || "个人参赛",
                teamName: regData.teamName || "--",
                members: regData.members || "张三",
                status: "待提交成果",
                regTime: new Date().toLocaleString(),
                submissionFile: null,
                submissionTime: null,
                auditFeedback: null
            };
            regs.unshift(newReg);
            localStorage.setItem("yiban_registrations", JSON.stringify(regs));
            return newReg;
        },

        uploadSubmission: (regId, fileName) => {
            const regs = YibanDB.getRegistrations();
            const reg = regs.find(r => r.id === regId);
            if (reg) {
                reg.status = "待审核";
                reg.submissionFile = fileName;
                reg.submissionTime = new Date().toLocaleString();
                localStorage.setItem("yiban_registrations", JSON.stringify(regs));

                // Also add to audit list for teacher
                const audits = YibanDB.getAudits();
                const user = YibanDB.getCurrentUser();
                audits.unshift({
                    id: "audit_" + Date.now(),
                    regId: reg.id,
                    studentName: user.name,
                    studentId: user.id,
                    compName: reg.compName,
                    teamName: reg.teamName,
                    fileName: fileName,
                    submitTime: reg.submissionTime,
                    status: "待审核"
                });
                localStorage.setItem("yiban_audits", JSON.stringify(audits));
                return true;
            }
            return false;
        },

        auditSubmission: (auditId, action, feedback = "") => {
            // action: 'approve' or 'reject'
            const audits = YibanDB.getAudits();
            const audit = audits.find(a => a.id === auditId);
            if (audit) {
                audit.status = action === "approve" ? "已通过" : "已驳回";
                localStorage.setItem("yiban_audits", JSON.stringify(audits));

                // Update original registration
                const regs = YibanDB.getRegistrations();
                const reg = regs.find(r => r.id === audit.regId || (r.compName === audit.compName && r.teamName === audit.teamName));
                if (reg) {
                    reg.status = action === "approve" ? "已审核通过" : "已驳回";
                    reg.auditFeedback = feedback || (action === "approve" ? "成果审核符合标准，通过加分审核。" : "提交成果有缺漏，请重新上传。");
                    localStorage.setItem("yiban_registrations", JSON.stringify(regs));
                }
                return true;
            }
            return false;
        },

        resetDB: () => {
            localStorage.removeItem("yiban_db_initialized");
            localStorage.removeItem("yiban_competitions");
            localStorage.removeItem("yiban_registrations");
            localStorage.removeItem("yiban_audits");
            localStorage.removeItem("yiban_current_user");
            initDB();
            console.log("Simulated DB Resetted!");
        }
    };
})();
