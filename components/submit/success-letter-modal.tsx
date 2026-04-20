"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface SuccessModalContent {
  greeting: string;
  paragraphs: string[];
  exploreTitle: string;
  wechatTitle: string;
  wechatHint: string;
  signature: string;
}

interface SuccessLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: SuccessModalContent;
}

export default function SuccessLetterModal({ isOpen, onClose, content }: SuccessLetterModalProps) {
  const [isOpenLetter, setIsOpenLetter] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsOpenLetter(false);
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenLetter = () => {
    setIsOpenLetter(true);
    // Delay showing content full text to match envelope opening animation
    setTimeout(() => {
      setShowContent(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-[#2C2C2C]/60 backdrop-blur-sm transition-opacity duration-500 ${isOpenLetter ? 'opacity-100' : 'opacity-100'}`}
        onClick={onClose}
      />

      {/* Container */}
      <div className="relative w-full max-w-2xl z-10 flex flex-col items-center justify-center min-h-[400px]">
        
        {/* Closed Envelope View */}
        {!showContent && (
          <div 
            className={`relative w-full max-w-md aspect-[3/2] bg-[#E8E4DF] rounded-md shadow-[0_15px_40px_rgba(0,0,0,0.15),_0_0_0_1px_rgba(255,255,255,0.5)_inset] transition-all duration-700 ease-in-out transform ${
              isOpenLetter ? 'scale-110 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
            }`}
          >
            {/* Envelope Back (what we see) */}
            <div className="absolute inset-0 bg-[#F9F6F0] rounded-md overflow-hidden flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(#D7CCC8 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
              
              {/* Journal Washi Tape - Top Right */}
              <div className="absolute -top-2 right-4 w-20 h-6 bg-[#A1887F]/30 -rotate-6 z-40 transform pointer-events-none backdrop-blur-sm" style={{ clipPath: 'polygon(5% 0, 100% 2%, 95% 100%, 0 98%)' }}></div>
              <div className="absolute -top-1 right-12 w-16 h-5 bg-[#E2D5C8]/70 rotate-3 z-40 transform pointer-events-none backdrop-blur-sm shadow-sm" style={{ clipPath: 'polygon(0 5%, 95% 0, 100% 95%, 5% 100%)', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.4) 5px, rgba(255,255,255,0.4) 10px)' }}></div>

              {/* Journal Postmark - Top Left */}
              <div className="absolute top-4 left-6 w-20 h-20 rounded-full border-[3px] border-dashed border-[#8D6E63]/30 flex flex-col items-center justify-center rotate-[-12deg] pointer-events-none z-10 opacity-70">
                <div className="text-[9px] text-[#8D6E63]/60 font-sans tracking-wide">POSTAL</div>
                <div className="text-[12px] text-[#8D6E63]/80 font-bold border-y-2 border-[#8D6E63]/40 my-1 px-4 tracking-widest">XINGHUO</div>
                <div className="text-[9px] text-[#8D6E63]/60 font-sans tracking-wide">2026</div>
              </div>

              {/* Flaps */}
              <div className="absolute top-0 left-0 w-full h-[60%] bg-[#F2EDE4] origin-top transform rotate-180 z-20 shadow-[0_5px_15px_rgba(0,0,0,0.06),_0_0_0_1px_rgba(255,255,255,0.5)_inset]" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}></div>
              <div className="absolute bottom-0 left-0 w-full h-[60%] bg-[#FAF8F3] z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]" style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 0)' }}></div>
              <div className="absolute top-0 left-0 w-[60%] h-full bg-[#F7F4EB] z-15 shadow-[2px_0_10px_rgba(0,0,0,0.02)]" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 50%)' }}></div>
              <div className="absolute top-0 right-0 w-[60%] h-full bg-[#F4F0E6] z-15 shadow-[-2px_0_10px_rgba(0,0,0,0.02)]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }}></div>
              
              {/* Torn Paper effect behind seal */}
              <div className="absolute z-25 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-14 bg-[#FAF8F3] rotate-3 opacity-90" style={{ clipPath: 'polygon(5% 0, 95% 5%, 100% 90%, 5% 100%, 0 45%)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}></div>

              {/* Sticker Seal */}
              <button 
                onClick={handleOpenLetter}
                className="absolute z-30 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] flex items-center justify-center group outline-none"
                aria-label="打开信件"
              >
                {/* Sticker Base */}
                <div className="relative w-full h-full bg-[#FAF8F5] shadow-[0_4px_10px_rgba(0,0,0,0.1),_0_0_0_1px_rgba(0,0,0,0.05)_inset] rounded-full flex items-center justify-center overflow-hidden transition-all duration-300">
                  {/* Wavy/Scalloped border effect using conic-gradient or SVG-like approach */}
                  <div className="absolute inset-1 rounded-full border border-dashed border-[#D7CCC8]/60 m-1 flex items-center justify-center bg-[#FDFBF7]">
                    <span className="font-youyou text-[#8D6E63] text-2xl font-bold tracking-widest z-10 transition-transform duration-500 group-hover:scale-105">星</span>
                    
                    {/* Decorative tiny stars/dots inside sticker */}
                    <div className="absolute top-2 right-3 w-1 h-1 rounded-full bg-[#C5B3A6] opacity-60"></div>
                    <div className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-[#E2D5C8] opacity-80"></div>
                  </div>
                  
                  {/* Subtle paper texture on sticker */}
                  <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

                  {/* Peel Effect (Page Curl) */}
                  <div className="absolute bottom-0 right-0 w-0 h-0 transition-all duration-500 ease-out z-20 peel-corner"
                       style={{
                         background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.05) 50%, rgba(255,255,255,0.9) 60%, rgba(250,248,245,1) 100%)',
                         boxShadow: '-2px -2px 5px rgba(0,0,0,0.1)',
                         borderTopLeftRadius: '100%'
                       }}
                  ></div>
                </div>
              </button>
              
              {/* Hint text */}
              <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-[12px] text-[#A1887F] font-youyou tracking-[0.2em] z-30 animate-pulse pointer-events-none italic drop-shadow-sm">
                点击贴纸启封
              </p>
              
              {/* Journal Washi Tape - Bottom Left */}
              <div className="absolute bottom-4 left-[-10px] w-24 h-5 bg-[#C5B3A6]/40 rotate-12 z-40 transform pointer-events-none backdrop-blur-sm" style={{ clipPath: 'polygon(0 2%, 98% 0, 100% 100%, 2% 98%)', backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '6px 6px' }}></div>
            </div>
          </div>
        )}

        {/* Opened Letter View */}
        <div 
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-700 delay-300 ${
            showContent ? 'opacity-100 pointer-events-auto transform translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="relative w-full max-h-[85vh] overflow-y-auto bg-[#FDFBF7] rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col p-6 sm:p-10 md:p-12 background-paper">
            
            {/* Texture overlay for paper effect */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            {/* Scrapbook corner decoration */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-[#D7CCC8]/60 -translate-x-2 -translate-y-2 rounded-tl-xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-[#D7CCC8]/60 translate-x-2 translate-y-2 rounded-br-xl pointer-events-none"></div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 sm:right-6 sm:top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/50 text-[#8D8D8D] hover:bg-white hover:text-[#5D5D5D] transition-colors shadow-sm z-20"
              aria-label="关闭信件"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 max-w-prose mx-auto w-full">
              <div className="text-center mb-8 sm:mb-12">
                <div className="inline-block border-b border-[#D7CCC8] pb-4 mb-4">
                  <h2 className="font-youyou text-2xl sm:text-3xl md:text-4xl text-[#3A3A3A] tracking-wider">
                    这是您的一封回信
                  </h2>
                </div>
              </div>
              
              <div className="space-y-6 text-[#4B433E] text-[15px] sm:text-base leading-relaxed sm:leading-loose">
                <p className="font-youyou text-lg">{content.greeting}</p>
                
                {content.paragraphs.map((paragraph, idx) => (
                  <p key={idx} className="indent-8 text-justify">{paragraph}</p>
                ))}
              </div>

              <div className="mt-10 sm:mt-12 p-6 sm:p-8 rounded-xl bg-gradient-to-br from-[#F5F2EC] to-[#FDFBF7] border border-[#E8E4DF] shadow-inner">
                <p className="text-xs sm:text-sm tracking-[0.2em] text-[#A1887F] mb-6 font-bold text-center">
                  ~ {content.exploreTitle} ~
                </p>

                <div className="space-y-6 sm:space-y-8 text-sm sm:text-base leading-relaxed text-[#5A504A]">
                  <div className="flex flex-col items-center justify-center text-center space-y-2">
                    <p className="font-youyou text-[#3A3A3A]">
                      {content.wechatTitle}
                    </p>
                    <p className="text-xs sm:text-sm text-[#7C746D]">
                      {content.wechatHint}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-12 sm:mt-16 text-right">
                <p className="font-youyou text-[#8D6E63] text-lg sm:text-xl italic">
                  {content.signature}
                </p>
                <div className="mt-4 flex justify-end">
                  <div className="w-12 h-12 rounded-full border border-[#D7CCC8] flex items-center justify-center opacity-50">
                    <span className="font-youyou text-[#A1887F]">星火</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

      </div>
      
      <style jsx>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .background-paper {
          background-color: #FDFBF7;
          background-image: 
            linear-gradient(#f4f0e6 1px, transparent 1px),
            linear-gradient(90deg, #f4f0e6 1px, transparent 1px);
          background-size: 20px 20px;
          background-position: center;
        }
        .peel-corner {
          width: 0px;
          height: 0px;
        }
        .group:hover .peel-corner {
          width: 25px;
          height: 25px;
        }
      `}</style>
    </div>
  );
}
