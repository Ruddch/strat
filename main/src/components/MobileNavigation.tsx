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
                  Treasury
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
          
          {/* Wallet Section - Bottom */}
          <div className="mt-auto">
            <SignInButton />
          </div>
        </div>
      </div>
    </>
  );
}
