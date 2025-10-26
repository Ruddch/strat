"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScroll } from "@/contexts/ScrollContext";
import { SignInButton } from "@/components/wallet/SignInButton";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { activeSection } = useScroll();

  // Функция для скролла к секции
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsOpen(false); // Закрываем меню после клика
  };


  return (
    <>
      {/* Бургер-кнопка */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-2 left-2 z-50 p-1.5 bg-transparent border border-[var(--color-border-accent)] lg:hidden"
        aria-label="Toggle menu"
        style={{
          backdropFilter: 'blur(4px)'
        }}
      >
        <div className="w-6 h-6 flex flex-col justify-center space-y-1">
          <span className={`block h-0.5 bg-[var(--color-text-accent)] transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <span className={`block h-0.5 bg-[var(--color-text-accent)]  transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 bg-[var(--color-text-accent)]  transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Мобильное меню */}
      <div className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-black border-r border-[var(--color-border-accent)] z-40 transform transition-transform duration-300 lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full p-6 pt-16">
          {/* Logo/Brand */}
          <div className="mb-8">
            <Link href="/" className="block hover:opacity-80 transition-opacity cursor-pointer" onClick={() => setIsOpen(false)}>
              <h1 className="text-[20px] font-light leading-[150%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-martian-mono)]">
                PENGU<br/>STRATEGY
              </h1>
            </Link>
            
            {/* Navigation Links - Only show on home page */}
            {pathname === "/" && (
              <div className="mt-6 space-y-6">
                <button 
                  onClick={() => scrollToSection('live')}
                  className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                    activeSection === 'live' 
                      ? 'text-[var(--color-text-accent)]' 
                      : 'text-white'
                  }`}
                >
                  Live
                </button>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                    activeSection === 'how-it-works' 
                      ? 'text-[var(--color-text-accent)]' 
                      : 'text-white'
                  }`}
                >
                  How it works
                </button>
                <button 
                  onClick={() => scrollToSection('trading')}
                  className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                    activeSection === 'trading' 
                      ? 'text-[var(--color-text-accent)]' 
                      : 'text-white'
                  }`}
                >
                  Trading
                </button>
                
                <button 
                  onClick={() => scrollToSection('take-profit')}
                  className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                    activeSection === 'take-profit' 
                      ? 'text-[var(--color-text-accent)]' 
                      : 'text-white'
                  }`}
                >
                  Upcoming Sales
                </button>
                <button 
                  onClick={() => scrollToSection('last-buys')}
                  className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                    activeSection === 'last-buys' 
                      ? 'text-[var(--color-text-accent)]' 
                      : 'text-white'
                  }`}
                >
                  Last Buys
                </button>
                <button 
                  onClick={() => scrollToSection('treasury')}
                  className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                    activeSection === 'treasury' 
                      ? 'text-[var(--color-text-accent)]' 
                      : 'text-white'
                  }`}
                >
                  Holders Dividends
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col space-y-6 flex-1">
            <Link
              href="/"
              className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                pathname === "/"
                  ? "text-[var(--color-text-accent)]"
                  : "text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/claim"
              className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                pathname === "/claim/"
                  ? "text-[var(--color-text-accent)]"
                  : "text-white"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Claim
            </Link>
            <a
              href="https://pengu-strategy.gitbook.io/pengu-strategy/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer text-white"
              onClick={() => setIsOpen(false)}
            >
              Docs
            </a>
          </div>
          
          {/* Social Links */}
          <div className="flex flex-row justify-start items-center space-x-6 mb-6">
            <a
              href="https://x.com/PudgyInvest"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="https://t.me/pudgyinvestsafeguard"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.894 6.221l-1.803 8.467c-.133.584-.472.73-.957.453l-2.646-1.948-1.277 1.224c-.145.145-.268.265-.549.265l.197-2.785 4.943-4.459c.217-.19.018-.294-.337-.106l-6.105 3.847-2.628-.815c-.578-.184-.59-.578.12-.865l10.284-3.958c.479-.177.896.112.737.858z"/>
              </svg>
            </a>
            <a
              href="https://dexscreener.com/abstract/0x881c97da8146aae6bc04437a36b0da37d89a8530"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round"/>
                <line x1="9" y1="3" x2="9" y2="21" strokeLinecap="round"/>
                <line x1="3" y1="9" x2="21" y2="9" strokeLinecap="round"/>
                <path d="M9 15L12 12L15 15" strokeLinecap="round"/>
                <path d="M9 12L12 15L15 12" strokeLinecap="round"/>
              </svg>
            </a>
          </div>
          
          {/* Wallet Section - Bottom */}
          <div className="mt-auto">
            <SignInButton />
          </div>
        </div>
      </div>
    </>
  );
}
