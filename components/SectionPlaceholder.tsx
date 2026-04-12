import Link from "next/link";
import Navbar from "@/components/Navbar";

interface SectionPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  note?: string;
  ctaHref: string;
  ctaLabel: string;
}

export default function SectionPlaceholder({
  eyebrow,
  title,
  description,
  note,
  ctaHref,
  ctaLabel,
}: SectionPlaceholderProps) {
  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />

      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 pb-20 pt-28 md:px-8 md:pt-32">
        <section className="w-full rounded-[2.5rem] border border-[#E8DDD6] bg-white/75 px-8 py-14 shadow-[0_30px_80px_rgba(122,97,83,0.08)] backdrop-blur-sm md:px-14 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#F1E7E1] md:h-28 md:w-28">
              <div className="h-10 w-10 rounded-full border border-[#C6A899] bg-white/70" />
            </div>

            <p className="text-xs uppercase tracking-[0.38em] text-[#A1887F]">
              {eyebrow}
            </p>
            <h1 className="mt-6 font-youyou text-4xl tracking-[0.18em] text-[#2C2C2C] md:text-6xl">
              {title}
            </h1>
            <p className="mx-auto mt-8 max-w-2xl font-serif text-lg leading-loose text-[#645A54] md:text-xl">
              {description}
            </p>

            {note ? (
              <>
                <div className="mx-auto mt-10 h-px w-20 bg-[#D8C8BF]" />
                <p className="mx-auto mt-10 max-w-xl font-serif text-sm leading-loose text-[#8E8179] md:text-base">
                  {note}
                </p>
              </>
            ) : null}

            <div className="mt-12">
              <Link
                href={ctaHref}
                className="inline-flex items-center rounded-full border border-[#CDBBB1] px-7 py-3 text-sm font-youyou tracking-[0.16em] text-[#5D5D5D] transition-all duration-300 hover:border-[#A1887F] hover:bg-[#A1887F] hover:text-white"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
