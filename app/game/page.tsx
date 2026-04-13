import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const gameEntries = [
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
  },
] as const;

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
          {gameEntries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              target="_blank"
              rel="noreferrer"
              className="group block max-w-[23rem]"
            >
              <article className="relative h-full overflow-hidden rounded-[2rem] border border-[#E9E2F4] bg-[linear-gradient(180deg,rgba(249,246,255,0.98),rgba(243,238,251,0.92))] p-6 shadow-[0_20px_60px_rgba(171,150,208,0.16)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(171,150,208,0.22)]">
                <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(190,172,235,0.32),transparent_72%)]" />

                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs tracking-[0.18em] text-[#8D849F]">{entry.eyebrow}</p>
                      <h2 className="mt-4 font-youyou text-3xl leading-[1.18] text-[#A288E8]">
                        {entry.title}
                      </h2>
                    </div>

                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D9C9F5] bg-white/70 text-[#A288E8] transition-transform duration-300 group-hover:-translate-y-1">
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  </div>

                  <p className="line-clamp-4 font-serif text-base leading-8 text-[#6E748A]">
                    {entry.description}
                  </p>

                  <div className="grid grid-cols-3 gap-3 border-y border-[#E4DCF3] py-4">
                    {entry.stats.map((stat) => (
                      <div key={stat.label} className="text-center">
                        <p className="font-youyou text-3xl text-[#A288E8]">{stat.value}</p>
                        <p className="mt-1 text-sm tracking-[0.12em] text-[#8D849F]">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="inline-flex items-center justify-center rounded-full bg-[#A288E8] px-6 py-3 font-youyou text-base tracking-[0.14em] text-white transition-colors duration-300 group-hover:bg-[#8F73DA]">
                    {entry.cta}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
