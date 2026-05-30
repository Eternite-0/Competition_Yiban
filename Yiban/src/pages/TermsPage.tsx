import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-ink antialiased">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-canvas-parchment" />

      {/* 顶栏 */}
      <div className="h-[44px] flex items-center px-xl text-[12px] tracking-tight text-ink bg-canvas border-b border-hairline">
        <Link to="/login" className="flex items-center gap-2 font-medium hover:text-primary transition">
          <span className="material-symbols-outlined text-[16px] text-primary icon-fill">workspace_premium</span>
          易赛通 · 学生竞赛管理平台
        </Link>
      </div>

      <div className="max-w-[800px] mx-auto px-xl py-xxl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong px-xl py-xl"
        >
          <h1 className="font-display font-semibold text-[28px] tracking-tight text-ink mb-lg">
            用户注册协议
          </h1>

          <div className="prose prose-sm max-w-none text-ink-muted-80 leading-relaxed space-y-6">
            <section>
              <h2 className="text-[16px] font-semibold text-ink mt-lg mb-2">一、总则</h2>
              <p className="text-[14px]">
                1.1 本协议是您（以下简称"用户"）与易赛通高校赛事报名管理系统（以下简称"本系统"）之间关于使用本系统服务所订立的契约。
              </p>
              <p className="text-[14px]">
                1.2 本系统由学生处信息中心负责运营和管理，为在校师生提供赛事报名、成果提交、团队组建等服务。
              </p>
              <p className="text-[14px]">
                1.3 用户在注册过程中点击"同意"按钮，即表示用户已充分阅读、理解并接受本协议的全部内容。
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-ink mt-lg mb-2">二、账号注册</h2>
              <p className="text-[14px]">
                2.1 学生用户须使用学校统一发放的学号进行注册，注册信息须与学籍信息一致。
              </p>
              <p className="text-[14px]">
                2.2 教师用户须使用工号进行注册，注册后需经管理员审核通过方可使用。
              </p>
              <p className="text-[14px]">
                2.3 用户应妥善保管账号和密码，因用户原因导致的账号安全问题由用户自行承担。
              </p>
              <p className="text-[14px]">
                2.4 用户不得将账号转让、出借给他人使用。
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-ink mt-lg mb-2">三、用户行为规范</h2>
              <p className="text-[14px]">
                3.1 用户在使用本系统时应遵守国家法律法规和学校相关规定。
              </p>
              <p className="text-[14px]">
                3.2 用户不得利用本系统从事以下行为：
              </p>
              <ul className="list-disc pl-6 text-[14px] space-y-1">
                <li>发布、传播违法违规信息</li>
                <li>冒用他人身份进行注册或报名</li>
                <li>恶意干扰系统正常运行</li>
                <li>侵犯他人知识产权</li>
                <li>其他违反法律法规或学校规定的行为</li>
              </ul>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-ink mt-lg mb-2">四、知识产权</h2>
              <p className="text-[14px]">
                4.1 本系统的软件、技术、内容等知识产权归学生处信息中心所有。
              </p>
              <p className="text-[14px]">
                4.2 用户在本系统上传的作品，其知识产权归用户或其所在团队所有，但用户授权本系统为赛事管理目的使用相关作品。
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-ink mt-lg mb-2">五、隐私保护</h2>
              <p className="text-[14px]">
                5.1 本系统重视用户隐私保护，具体隐私政策请参阅《隐私政策》。
              </p>
              <p className="text-[14px]">
                5.2 本系统收集的用户信息仅用于赛事管理和身份验证，不会向第三方披露。
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-ink mt-lg mb-2">六、免责声明</h2>
              <p className="text-[14px]">
                6.1 因系统维护、升级等原因导致的服务中断，本系统将提前通知用户。
              </p>
              <p className="text-[14px]">
                6.2 因不可抗力导致的服务中断或数据丢失，本系统不承担责任。
              </p>
              <p className="text-[14px]">
                6.3 用户因违反本协议导致的账号封禁或其他损失，本系统不承担责任。
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-ink mt-lg mb-2">七、协议修改</h2>
              <p className="text-[14px]">
                7.1 本系统有权根据需要修改本协议，修改后的协议将在系统内公告。
              </p>
              <p className="text-[14px]">
                7.2 用户继续使用本系统即视为同意修改后的协议。
              </p>
            </section>

            <section>
              <h2 className="text-[16px] font-semibold text-ink mt-lg mb-2">八、争议解决</h2>
              <p className="text-[14px]">
                8.1 本协议的解释和执行适用中华人民共和国法律。
              </p>
              <p className="text-[14px]">
                8.2 因本协议引起的争议，双方应友好协商解决；协商不成的，可向有管辖权的人民法院提起诉讼。
              </p>
            </section>
          </div>

          <div className="mt-xl pt-lg border-t border-hairline text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 h-[44px] px-6 rounded-pill bg-primary text-on-primary text-[14px] font-medium hover:bg-primary-focus transition"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              返回注册
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
