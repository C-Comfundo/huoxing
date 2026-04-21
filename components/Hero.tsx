"use client";

import { ArrowDown } from "lucide-react";
import Image from "next/image";

interface HeroProps {
  coverImage?: string | null;
}

export default function Hero({ coverImage }: HeroProps) {
  const posterSrc = coverImage || "/poster.webp";

  return (
    <section className="relative min-h-[100svh] md:h-[100svh] w-full flex flex-col justify-center items-center px-6 md:px-8 lg:px-12 xl:px-24 bg-[#F7F5F0] overflow-hidden pt-28 md:pt-12 lg:pt-0 pb-20 md:pb-0">
      {/* Background Texture */}
      <div className="absolute inset-0 paper-texture opacity-30 pointer-events-none" />

      {/* Main Content Grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto h-full flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-8 justify-center lg:items-center">
        
        {/* Typography */}
        <div className="flex flex-col justify-center w-full z-30 relative text-left transform lg:translate-x-8 xl:translate-x-12">
          <h1 className="font-liuye text-[2.75rem] sm:text-5xl md:text-6xl lg:text-[5.5rem] xl:text-[7rem] leading-[1.15] opacity-95 tracking-tight drop-shadow-sm">
            <span className="inline-block whitespace-nowrap">让女性书写女性</span>
            <br />
            <span className="inline-block mt-3 md:mt-6 text-[#5D5D5D] opacity-80 text-[2.25rem] sm:text-4xl md:text-5xl lg:text-[4.5rem] xl:text-[6rem] whitespace-nowrap">
              让女性讲述女性
            </span>
          </h1>
          
          <div className="mt-8 lg:mt-16 border-l-[3px] border-[#D7CCC8]/80 pl-6 opacity-0 animate-fade-in-up delay-[400ms]">
            <p className="font-youyou text-lg sm:text-xl md:text-2xl text-[#757575] tracking-[0.25em] leading-relaxed">
              每个人都是一个叙事体
            </p>
            <p className="font-sans text-[10px] sm:text-xs md:text-sm text-[#9E9E9E] mt-3 md:mt-4 tracking-widest font-light uppercase">
              万物可叙，人人皆星
            </p>
          </div>
        </div>

        {/* The Poster Card */}
        <div className="relative w-[75vw] max-w-[280px] sm:max-w-[320px] lg:max-w-[340px] xl:max-w-[360px] opacity-0 animate-[fadeInUp_0.8s_ease-out_0.6s_forwards] z-20 flex justify-center lg:items-center lg:w-full lg:mx-auto ml-auto mr-4 md:mr-auto">
          <div className="relative w-full">
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#A1887F]/30 via-[#C83E4D]/20 to-transparent rounded-full blur-[40px] scale-[1.2] -z-10" />
            
            {/* Image Wrapper - Physical Poster Effect */}
            <div className="relative w-full rounded-sm bg-[#FDFCFB] p-2 md:p-3 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.25)] transform rotate-[8deg] lg:rotate-[4deg] transition-transform duration-700 hover:rotate-[2deg] hover:-translate-y-2 hover:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.35)] ring-1 ring-[#D7CCC8]/50">
              
              {/* Top Masking Tape */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 md:w-20 h-6 md:h-7 bg-[#EBE9E1]/90 shadow-sm rotate-[-8deg] z-20 border border-black/5 backdrop-blur-sm" />
              
              {/* Bottom Right Masking Tape */}
              <div className="absolute -bottom-3 -right-3 w-12 md:w-14 h-5 md:h-6 bg-[#EBE9E1]/90 shadow-sm rotate-[-35deg] z-20 border border-black/5 backdrop-blur-sm" />

              <div className="relative w-full rounded-[2px] overflow-hidden bg-[#F7F5F0]">
                <Image 
                  src={posterSrc}
                  alt="星火好看 当期封面"
                  width={800}
                  height={1131}
                  className="w-full h-auto block"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 animate-[fadeInUp_0.8s_ease-out_1s_forwards] z-30 hidden lg:block">
        <ArrowDown className="w-5 h-5 md:w-6 md:h-6 text-[#A1887F] animate-[bounce_3s_infinite] opacity-60" strokeWidth={1.5} />
      </div>
    </section>
  );
}
