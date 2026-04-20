import React from "react";
import { Paperclip } from "lucide-react";
import type { IssueCredit } from "@/lib/issue-credits";

interface IssueCreditsProps {
  data?: IssueCredit | null;
}

const NOISE_BG =
  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")';

export default function IssueCredits({ data }: IssueCreditsProps) {
  if (!data || data.members.length === 0) return null;

  return (
    <div className="relative mt-8 mx-auto max-w-4xl rounded-xl bg-[#FDFBF7] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E3D8D0]/60 sm:p-10 rotate-[0.5deg] hover:rotate-0 transition-transform duration-500">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-xl"
        style={{ backgroundImage: NOISE_BG }}
      />
      
      {/* Decorative top tape */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#C5B3A6]/40 z-20 backdrop-blur-sm opacity-90 shadow-sm rotate-1"
        style={{
          clipPath: "polygon(2% 0, 98% 2%, 100% 100%, 0 98%)",
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)",
          backgroundSize: "6px 6px",
        }}
      />

      {/* Clip icon */}
      <div className="absolute top-4 left-4 text-[#A1887F]/40 rotate-12">
        <Paperclip className="w-6 h-6" strokeWidth={1} />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="font-youyou text-xl md:text-2xl tracking-[0.15em] text-[#3A2C24] mb-8 text-center border-b border-[#D7CCC8]/50 pb-4 px-8">
          {data.title}
        </h3>

        <div className="w-full max-w-2xl space-y-4">
          {data.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 group"
            >
              <div className="w-16 sm:w-20 shrink-0 text-left sm:text-right">
                <span className="text-[#8D6E63] font-serif text-sm md:text-base tracking-[0.15em] font-medium opacity-90 relative inline-block">
                  {member.department}
                  <span className="hidden sm:inline-block absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#A1887F]/50" />
                </span>
              </div>
              <div className="flex-1 text-[#5C4D43] text-[0.95rem] md:text-base leading-relaxed pl-2 border-l-[2px] border-dotted border-[#D7CCC8]/40 sm:border-none sm:pl-0">
                {member.names}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex w-full items-center justify-center gap-2 text-[#8D6E63] opacity-95 sm:gap-3">
          <span className="h-[1px] min-w-4 flex-1 bg-[#C5B3A6]/70 sm:max-w-8" />
          <p className="whitespace-nowrap text-[0.9rem] font-semibold leading-relaxed tracking-[0.04em] text-center sm:text-sm sm:tracking-[0.12em] md:text-lg">
            {data.message}
          </p>
          <span className="h-[1px] min-w-4 flex-1 bg-[#C5B3A6]/70 sm:max-w-8" />
        </div>
      </div>
    </div>
  );
}
