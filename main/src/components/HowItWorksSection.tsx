"use client";

import React from 'react';

const HowItWorksSection: React.FC = () => {
  const scrollToTreasury = () => {
    const element = document.getElementById('treasury');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const scrollToUpcomingSales = () => {
    const element = document.getElementById('take-profit');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div>
      <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
        How it works
      </h2>
      
      {/* Content Grid - 2x2 Layout */}
      <div className="w-full border-b border-[var(--color-border-accent)]">
        {/* First Row */}
        <div className="flex flex-col lg:flex-row w-full border-b border-[var(--color-border-accent)]">
          {/* Step 1 */}
          <div className="flex-1 p-8 border-b lg:border-b-0 lg:border-r border-[var(--color-border-accent)]" style={{backgroundColor: 'rgba(96,255,255,0.05)'}}>
            <div className="text-left max-w-[570px]">
              <h3 className="text-[20px] font-light text-white mb-4 font-[family-name:var(--font-martian-mono)]">
                <span className="text-[var(--color-text-accent)]">1.</span> Fee mechanics
              </h3>
              <p className="text-[14px] font-light leading-[180%] text-gray-300 font-[family-name:var(--font-martian-mono)]">
                Every trade of $PST comes with a <span className="text-[16px] text-[var(--color-text-accent)] font-normal">10%</span> fee.<br/>
                From that — <span className="text-[16px] text-[var(--color-text-accent)] font-normal">8%</span> goes toward automatic $PENGU buybacks, 
                <span className="text-[16px] text-[var(--color-text-accent)] font-normal">1.5%</span> supports operations, 
                and <span className="text-[16px] text-[var(--color-text-accent)] font-normal">0.5%</span> goes to $INVEST ecosystem.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex-1 p-8" style={{backgroundColor: 'rgba(96,255,255,0.05)'}}>
            <div className="text-left max-w-[570px]">
              <h3 className="text-[20px] font-light text-white mb-4 font-[family-name:var(--font-martian-mono)]">
                <span className="text-[var(--color-text-accent)]">2.</span> Automatic buyback
              </h3>
              <p className="text-[14px] font-light leading-[180%] text-gray-300 font-[family-name:var(--font-martian-mono)]">
                Once the Collector balance reaches threshold, 
                it automatically triggers a $PENGU buy on the market — 
                keeping the buyback loop running continuously.
              </p>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="flex flex-col lg:flex-row w-full">
          {/* Step 3 */}
          <div className="flex-1 p-8 border-b lg:border-b-0 lg:border-r border-[var(--color-border-accent)]" style={{backgroundColor: 'rgba(96,255,255,0.05)'}}>
            <div className="text-left max-w-[570px]">
              <h3 className="text-[20px] font-light text-white mb-4 font-[family-name:var(--font-martian-mono)]">
                <span className="text-[var(--color-text-accent)]">3.</span> Rewards & recycling
              </h3>
              <p className="text-[14px] font-light leading-[180%] text-gray-300 font-[family-name:var(--font-martian-mono)]">
                The purchased $PENGU is split:<br/>
                <span className="text-[16px] text-[var(--color-text-accent)] font-normal">70%</span> is reserved for the next sell cycles, 
                and <span className="text-[16px] text-[var(--color-text-accent)] font-normal">30%</span> is used for <button 
                  onClick={scrollToTreasury}
                  className="text-[var(--color-text-accent)] hover:opacity-80 transition-opacity cursor-pointer underline decoration-[var(--color-text-accent)] underline-offset-2"
                >
                  weekly dividend payouts 
                </button> to strategy holders.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex-1 p-8" style={{backgroundColor: 'rgba(96,255,255,0.05)'}}>
            <div className="text-left max-w-[570px]">
              <h3 className="text-[20px] font-light text-white mb-4 font-[family-name:var(--font-martian-mono)]">
                <span className="text-[var(--color-text-accent)]">4.</span> Smart sellback
              </h3>
              <p className="text-[14px] font-light leading-[180%] text-gray-300 font-[family-name:var(--font-martian-mono)]">
                When $PENGU reaches its <button 
                  onClick={scrollToUpcomingSales}
                  className="text-[var(--color-text-accent)] hover:opacity-80 transition-opacity cursor-pointer underline decoration-[var(--color-text-accent)] underline-offset-2"
                >
                  predefined price target 
                </button>,
                it is automatically sold, 
                and the proceeds are used to buy back and burn $PST, 
                reducing supply and strengthening the ecosystem. 
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default HowItWorksSection;
