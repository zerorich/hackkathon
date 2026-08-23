import { Link } from "react-router-dom";
import {
  Bot,
  Crown,
  Flame,
  GraduationCap,
  MessageCircle,
  Mic,
  Rocket,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  Users,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Sparkles size={22} />,
    title: "AI challenge generatsiyasi",
    desc: "Har bir mavzu bo'yicha AI real vaqtda shaxsiy savollar to'plamini yaratadi. AI ishlamasa ham, tayyor challenge avtomatik taklif qilinadi — hech qachon to'xtab qolmaydi.",
  },
  {
    icon: <Swords size={22} />,
    title: "Do'stlar bilan duel",
    desc: "Challenge'ni tugatib do'stingizga havola yuboring. Do'st topilmasa — Zehn AI Bot bilan darhol duel qiling.",
  },
  {
    icon: <Flame size={22} />,
    title: "Hero — kuchayib boruvchi qahramon",
    desc: "Har bir yechilgan mavzu va yutilgan duel uchun sizning Hero'ingiz kuchayadi. Oyning eng zo'r Hero egasi maxsus mukofot oladi.",
  },
  {
    icon: <MessageCircle size={22} />,
    title: "Zehn AI bilan ovozli suhbat",
    desc: "Tugmani bosing, gapiring — AI eshitadi, javob beradi va ovozda o'qib beradi. Uy vazifasida qiynalgan joyingizni AI darhol tushuntirib beradi.",
  },
  {
    icon: <Trophy size={22} />,
    title: "Sinf reytingi",
    desc: "XP, streak va aniqlik bo'yicha jonli reyting — sinfingizdagi eng faol o'quvchilarni ko'ring, haftalik va oylik chempionlarni biling.",
  },
  {
    icon: <GraduationCap size={22} />,
    title: "O'qituvchi paneli",
    desc: "Sinf yarating, mavzular qo'shing, AI tahlili orqali qaysi mavzuda sinf qiynalayotganini bir qarashda ko'ring.",
  },
];

const STEPS = [
  {
    icon: <UserRound size={20} />,
    title: "Ro'yxatdan o'ting",
    desc: "O'zingizga login va parol o'ylab toping — 10 soniyada tayyor.",
  },
  {
    icon: <Rocket size={20} />,
    title: "Challenge yeching",
    desc: "AI siz uchun mavzu bo'yicha qiziqarli savollar tayyorlaydi.",
  },
  {
    icon: <Swords size={20} />,
    title: "Do'stni chaqiring",
    desc: "Natijangizni ulashing, duel qiling, reytingda ko'tariling.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing-light">
      <div className="lp-blob lp-blob-1" />
      <div className="lp-blob lp-blob-2" />

      <div className="lp-container">
        <nav className="lp-nav">
          <div className="lp-brand">
            <div className="lp-brand-icon">
              <Sparkles size={18} />
            </div>
            Zehn AI
          </div>
          <div className="lp-nav-links">
            <a href="#features">Imkoniyatlar</a>
            <a href="#how">Qanday ishlaydi</a>
            <a href="#roles">Kimlar uchun</a>
          </div>
          <Link to="/login" className="btn btn-secondary btn-sm">
            Kirish
          </Link>
        </nav>

        <section className="lp-hero fade-in-up">
          <span className="lp-eyebrow">
            <Sparkles size={14} /> AI yordamida o'qish
          </span>
          <h1>
            Zukko bo'l, <span>Yetakchi bo'l</span>
          </h1>
          <p className="lp-hero-text">
            Zehn AI — maktab o'quvchilari uchun AI asosidagi o'qish platformasi. Har bir mavzu qiziqarli
            challenge'ga, har bir g'alaba esa kuchliroq Hero'ga aylanadi. Do'stlaringiz bilan raqobatlashing,
            o'qituvchingiz esa sinf natijalarini bir joyda ko'radi.
          </p>
          <div className="lp-cta-row">
            <Link to="/login" state={{ role: "student" }} className="btn btn-primary">
              <UserRound size={16} /> O'quvchi sifatida boshlash
            </Link>
            <Link to="/login" state={{ role: "teacher" }} className="btn btn-secondary">
              <GraduationCap size={16} /> O'qituvchi sifatida kirish
            </Link>
          </div>

          <div className="lp-stat-row">
            <div className="lp-stat">
              <Zap size={16} />
              <span>AI challenge — cheksiz</span>
            </div>
            <div className="lp-stat">
              <Bot size={16} />
              <span>Bot bilan duel — har doim</span>
            </div>
            <div className="lp-stat">
              <Mic size={16} />
              <span>Ovozli AI yordamchi</span>
            </div>
          </div>
        </section>

        <section className="lp-preview fade-in-up delay-1">
          <div className="lp-preview-card lp-preview-card-1">
            <div className="lp-preview-row">
              <div className="lp-preview-avatar">🦊</div>
              <div>
                <strong>Javohir</strong>
                <div className="muted">Level 15 Hero</div>
              </div>
            </div>
            <div className="lp-preview-bar">
              <div className="lp-preview-bar-fill" style={{ width: "82%" }} />
            </div>
          </div>
          <div className="lp-preview-card lp-preview-card-2">
            <Flame size={20} color="#f97316" />
            <div>
              <strong>12 kunlik streak</strong>
              <div className="muted">Har kuni faol</div>
            </div>
          </div>
          <div className="lp-preview-card lp-preview-card-3">
            <Trophy size={20} color="#eab308" />
            <div>
              <strong>#1 sinf reytingida</strong>
              <div className="muted">3,450 XP</div>
            </div>
          </div>
          <div className="lp-preview-card lp-preview-card-4">
            <Swords size={20} color="#2563eb" />
            <div>
              <strong>Bot bilan duel</strong>
              <div className="muted">Darhol boshlanadi</div>
            </div>
          </div>
        </section>

        <section id="features" className="lp-section">
          <h2 className="lp-section-title">Nega aynan Zehn AI?</h2>
          <p className="lp-section-subtitle">
            Oddiy AI-chat emas — o'yin mexanikasi bilan birlashgan to'liq o'qish platformasi.
          </p>
          <div className="lp-feature-grid">
            {FEATURES.map((f, i) => (
              <div className={`lp-feature-card fade-in-up delay-${(i % 3) + 1}`} key={f.title}>
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="lp-section">
          <h2 className="lp-section-title">Qanday ishlaydi</h2>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div className="lp-step" key={s.title}>
                <div className="lp-step-number">{i + 1}</div>
                <div className="lp-step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="roles" className="lp-roles">
          <div className="lp-role-card lp-role-student">
            <UserRound size={26} />
            <h3>O'quvchilar uchun</h3>
            <p>Challenge yeching, Hero'ingizni kuchaytiring, do'stlaringiz bilan duel qiling.</p>
            <Link to="/login" state={{ role: "student" }} className="btn btn-primary">
              O'quvchi sifatida kirish
            </Link>
          </div>
          <div className="lp-role-card lp-role-teacher">
            <GraduationCap size={26} />
            <h3>O'qituvchilar uchun</h3>
            <p>Sinf yarating, mavzular qo'shing va AI tahlili bilan sinfingizni kuzating.</p>
            <Link to="/login" state={{ role: "teacher" }} className="btn btn-primary-teacher">
              O'qituvchi sifatida kirish
            </Link>
          </div>
        </section>

        <section className="lp-pitch">
          <div className="lp-pitch-badge">
            <Crown size={14} /> Hakaton g'oyasi
          </div>
          <h2 className="lp-section-title">O'zi tarqaladigan mahsulot</h2>
          <div className="lp-pitch-grid">
            <div className="lp-pitch-card">
              <Users size={20} />
              <strong>Auditoriya</strong>
              <p>Maktabdagi do'stlar va ustozlar — hammaga tanish muhit.</p>
            </div>
            <div className="lp-pitch-card">
              <Rocket size={20} />
              <strong>Mexanika</strong>
              <p>Ko'rgan bola do'stiga ko'rsatgisi keladi — duel va Hero orqali o'zi tarqaladi.</p>
            </div>
            <div className="lp-pitch-card">
              <Sparkles size={20} />
              <strong>To'liq ishlaydi</strong>
              <p>Haqiqiy backend, real AI, real duel — demo emas, tayyor mahsulot.</p>
            </div>
          </div>
        </section>

        <footer className="lp-footer">
          <p>Zehn AI — maktablar uchun AI o'qish platformasi</p>
        </footer>
      </div>
    </div>
  );
}
