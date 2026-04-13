import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";

type GameTheme = "violet" | "matrix";

type GameEntry = {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  stats: ReadonlyArray<{
    value: string;
    label: string;
  }>;
  cta: string;
  theme: GameTheme;
};

type ThemeStyle = {
  articleClassName: string;
  eyebrowClassName: string;
  titleClassName: string;
  iconClassName: string;
  descriptionClassName: string;
  statsClassName: string;
  statClassName: string;
  statValueClassName: string;
  statLabelClassName: string;
  buttonClassName: string;
  clipPath?: string;
  chromeLabel?: string;
};

const gameEntries: readonly GameEntry[] = [
  {
    title: "找到蕴藏在你身体里的女性力量",
    eyebrow: "女性力量人格图鉴",
    description:
      "在这些日常的场景选择里，看见你藏在细节里的独特气质，解锁属于你的女性内核力量。",
    href: "https://fpti.aifnd.top/",
    stats: [
      { value: "25", label: "题目数" },
      { value: "4", label: "核心维度" },
      { value: "3", label: "预计时间" },
    ],
    cta: "开始测试",
    theme: "violet",
  },
  {
    title: "女性自证陷阱破局测试",
    eyebrow: "暗黑互动测试",
    description:
      "在职场、生活与网络的典型场景里，识别那些让你不断自证的隐形陷阱，拆解叙事，找到更清醒的破局方式。",
    href: "https://trap-quiz.aifnd.top/",
    stats: [
      { value: "3", label: "现实场景" },
      { value: "暗黑", label: "体验氛围" },
      { value: "互动", label: "测试形式" },
    ],
    cta: "开始破局",
    theme: "matrix",
  },
];

const themeStyles: Record<GameTheme, ThemeStyle> = {
  violet: {
    articleClassName:
      "rounded-[2rem] border border-[#E9E2F4] bg-[linear-gradient(180deg,rgba(249,246,255,0.98),rgba(243,238,251,0.92))] shadow-[0_20px_60px_rgba(171,150,208,0.16)] hover:shadow-[0_26px_70px_rgba(171,150,208,0.22)]",
    eyebrowClassName: "text-xs tracking-[0.18em] text-[#8D849F]",
    titleClassName: "mt-4 font-youyou text-3xl leading-[1.18] text-[#A288E8]",
    iconClassName:
      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D9C9F5] bg-white/70 text-[#A288E8] transition-transform duration-300 group-hover:-translate-y-1",
    descriptionClassName: "line-clamp-4 font-serif text-base leading-8 text-[#6E748A]",
    statsClassName: "grid grid-cols-3 gap-3 border-y border-[#E4DCF3] py-4",
    statClassName: "text-center",
    statValueClassName: "font-youyou text-3xl text-[#A288E8]",
    statLabelClassName: "mt-1 text-sm tracking-[0.12em] text-[#8D849F]",
    buttonClassName:
      "inline-flex items-center justify-center rounded-full bg-[#A288E8] px-6 py-3 font-youyou text-base tracking-[0.14em] text-white transition-colors duration-300 group-hover:bg-[#8F73DA]",
  },
  matrix: {
    articleClassName:
      "rounded-[0.65rem] border border-[#194622] bg-[linear-gradient(180deg,rgba(0,10,1,0.98),rgba(2,22,6,0.94))] shadow-[0_20px_70px_rgba(0,255,65,0.12)] hover:shadow-[0_28px_85px_rgba(0,255,65,0.18)]",
    eyebrowClassName:
      "font-mono text-[0.72rem] tracking-[0.32em] text-[#35FF74] uppercase",
    titleClassName:
      "mt-4 font-mono text-[1.75rem] font-semibold leading-[1.15] tracking-[0.08em] text-[#C7FFD3] [text-shadow:0_0_18px_rgba(0,255,65,0.25)]",
    iconClassName:
      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.2rem] border border-[#2EAB4A] bg-[#021106]/90 text-[#43FF7B] shadow-[0_0_20px_rgba(0,255,65,0.16)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_0_28px_rgba(0,255,65,0.22)]",
    descriptionClassName: "line-clamp-4 text-sm leading-7 text-[#7BB18A]",
    statsClassName: "grid grid-cols-3 gap-3 border border-[#14351A] bg-[#020A03]/85 p-3",
    statClassName: "border border-[#123018] bg-[#051007]/90 px-2 py-3 text-center",
    statValueClassName: "font-mono text-2xl text-[#43FF7B]",
    statLabelClassName:
      "mt-2 font-mono text-[0.68rem] tracking-[0.18em] text-[#6B9B75] uppercase",
    buttonClassName:
      "inline-flex items-center justify-center rounded-[0.2rem] border border-[#35FF74]/60 bg-[linear-gradient(90deg,rgba(0,36,7,0.95),rgba(0,66,14,0.9))] px-5 py-3 font-mono text-sm tracking-[0.24em] text-[#D9FFE2] shadow-[0_0_28px_rgba(0,255,65,0.14)] transition-all duration-300 group-hover:border-[#6CFF97] group-hover:shadow-[0_0_36px_rgba(0,255,65,0.24)]",
    clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))",
    chromeLabel: "SYSTEM",
  },
};

export default function GamePage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-32 md:px-8">
        <header className="mb-14 md:mb-16">
          <div className="max-w-3xl space-y-5">
            <p className="text-xs uppercase tracking-[0.38em] text-[#9E8D80]">Play</p>
            <h1 className="font-youyou text-5xl tracking-[0.16em] text-[#2C2C2C] md:text-6xl">
              游戏
            </h1>
            <p className="max-w-2xl font-serif text-lg leading-loose text-[#645A54]">
              这里会慢慢收纳互动叙事、小测试与那些需要你亲手参与的作品。挑一张卡片，开始玩吧。
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {gameEntries.map((entry) => {
            const theme = themeStyles[entry.theme];
            const isMatrix = entry.theme === "matrix";

            return (
              <Link
                key={entry.href}
                href={entry.href}
                target="_blank"
                rel="noreferrer"
                className="group block max-w-[23rem]"
              >
                <article
                  className={`relative h-full overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 ${theme.articleClassName}`}
                  style={theme.clipPath ? { clipPath: theme.clipPath } : undefined}
                >
                  {isMatrix ? (
                    <>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,65,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(0,184,58,0.16),transparent_36%)]" />
                      <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(0,255,65,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.08)_1px,transparent_1px)] bg-[size:22px_22px]" />
                      <div className="absolute inset-0 opacity-60 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,255,65,0.03)_2px,rgba(0,255,65,0.03)_4px)]" />
                      <div className="absolute left-6 top-5 h-px w-20 bg-gradient-to-r from-transparent via-[#35FF74] to-transparent" />
                      <div className="absolute bottom-5 right-6 font-mono text-[0.68rem] tracking-[0.3em] text-[#2EAB4A]/80">
                        01
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(190,172,235,0.32),transparent_72%)]" />
                  )}

                  <div className="relative space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={theme.eyebrowClassName}>{entry.eyebrow}</p>
                        <h2 className={theme.titleClassName}>{entry.title}</h2>
                      </div>

                      <span className={theme.iconClassName}>
                        <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                    </div>

                    {theme.chromeLabel ? (
                      <p className="font-mono text-[0.68rem] tracking-[0.36em] text-[#2EAB4A]">
                        {theme.chromeLabel}
                      </p>
                    ) : null}

                    <p className={theme.descriptionClassName}>{entry.description}</p>

                    <div className={theme.statsClassName}>
                      {entry.stats.map((stat) => (
                        <div key={stat.label} className={theme.statClassName}>
                          <p className={theme.statValueClassName}>{stat.value}</p>
                          <p className={theme.statLabelClassName}>{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className={theme.buttonClassName}>{entry.cta}</div>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
