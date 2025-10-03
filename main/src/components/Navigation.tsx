"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScroll } from "@/contexts/ScrollContext";

export function Navigation() {
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
  };

  return (
    <nav className="fixed top-0 left-0 bottom-0 w-64 z-50 pl-10 hidden lg:block">
      <div className="flex flex-col h-full p-2 pt-11 pb-31 border-l border-r border-[var(--color-border-accent)]">
        {/* Logo/Brand */}
        <div className="mb-8">
          <Link href="/" className="block hover:opacity-80 transition-opacity cursor-pointer">
            <h1 className="text-[20px] w-41 font-light leading-[150%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-martian-mono)]">
              PENGU<br/>STRATEGY
            </h1>
          </Link>
          
          {/* Navigation Links - Only show on home page */}
          {pathname === "/" && (
            <div className="mt-6 space-y-8">
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
                onClick={() => scrollToSection('take-profit')}
                className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                  activeSection === 'take-profit' 
                    ? 'text-[var(--color-text-accent)]' 
                    : 'text-white'
                }`}
              >
                Take Profit
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
        <div className="flex flex-col space-y-8 flex-1">
        </div>
        
        {/* Bottom Navigation Links */}
        <div className="mt-auto">
          <div className="flex flex-col space-y-8">
            <Link
              href="/"
              className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity cursor-pointer ${
                pathname === "/"
                  ? "text-[var(--color-text-accent)]"
                  : "text-white"
              }`}
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
            >
              Claim
            </Link>
          </div>
        </div>
        
      </div>
    </nav>
  );
}
