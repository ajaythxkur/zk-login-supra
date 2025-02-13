import React from 'react';
import { ArrowUpIcon, Squares2X2Icon, ClockIcon } from '@heroicons/react/24/outline';

interface SiteHeaderProps {
  title: string;
}

const SiteHeader: React.FC<SiteHeaderProps> = ({ title }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 pt-4 pb-2 w-full max-w-2xl mx-auto md:max-w-3xl lg:max-w-4xl">
      <div className="bg-red-600 rounded-lg border-b-4 border-red-800 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.1)] overflow-hidden">
        <div className="flex justify-between">
          <div className="text-white hover:bg-[#c51b2b] transition-colors cursor-pointer flex-1 py-4 shadow-[inset_-2px_0_0_0_rgba(185,28,28,1)]">
            <p className="flex items-center justify-center space-x-2">
              <ArrowUpIcon className="w-5 h-5" />
              <span className="text-xl font-bold">Send</span>
            </p>
          </div>
          <div className="text-white hover:bg-[#c51b2b] transition-colors cursor-pointer flex-1 py-4 shadow-[inset_-2px_0_0_0_rgba(185,28,28,1)]">
            <p className="flex items-center justify-center space-x-2">
              <Squares2X2Icon className="w-5 h-5" />
              <span className="text-xl font-bold">Apps</span>
            </p>
          </div>
          <div className="text-white hover:bg-[#c51b2b] transition-colors cursor-pointer flex-1 py-4 shadow-[inset_2px_0_0_0_rgba(185,28,28,1)]">
            <p className="flex items-center justify-center space-x-2">
              <ClockIcon className="w-5 h-5" />
              <span className="text-xl font-bold">History</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
