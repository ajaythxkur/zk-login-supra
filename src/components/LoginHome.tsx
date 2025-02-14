import React from "react";
import Image from "next/image";
import Link from "next/link";
import { SOCIAL_ICONS } from "@/context/context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const LoginHome: React.FC = () => {
  const router = useRouter();
  const [loadingState, setLoadingState] = React.useState<'google' | 'twitch' | 'wallet' | null>(null);

  const handleAuthClick = async (provider: 'google' | 'twitch' | 'wallet') => {
    setLoadingState(provider);
    
    if (provider === 'wallet') {
      router.push('/send');
      return;
    }

    // Simulate async auth process for other providers
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoadingState(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#131722] to-[#000000] flex flex-col relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/SupraThing.png"
          alt="Background"
          layout="fill"
          objectFit="cover"
          objectPosition="center"
          className="opacity-100    " 
        />
      </div>

      {/* Header */}
      <header className="pt-10 flex justify-center z-10">
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 z-10">
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-[80px] font-black text-white leading-tight drop-shadow-lg">
            SENDING ASSETS<br />
            HAS NEVER BEEN<br />
            EASIER
          </h1>
          <p className="text-white text-xl mt-4 tracking-wide">
            SIMPLY CREATE A LINK AND SHARE IT.
          </p>
        </div>

        {/* Auth Buttons */}
        <div className="w-full max-w-sm flex flex-col gap-5">
          <Button 
            onClick={() => handleAuthClick('google')}
            disabled={!!loadingState}
            className="flex items-center justify-center gap-3 bg-black text-white 
                      py-4 px-6 rounded-full hover:bg-gray-800 transition-colors"
          >
            {loadingState === 'google' ? (
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <Image src={SOCIAL_ICONS.GOOGLE} alt="Google" width={24} height={24} />
                Sign in with Google
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => handleAuthClick('twitch')}
            disabled={!!loadingState}
            className="flex items-center justify-center gap-3 bg-[#6441a5] text-white 
                      py-4 px-6 rounded-full hover:bg-[#7d5bbe] transition-colors"
          >
            {loadingState === 'twitch' ? (
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <Image src={SOCIAL_ICONS.TWITCH} alt="Twitch" width={24} height={24} />
                Sign in with Twitch
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => handleAuthClick('wallet')}
            disabled={!!loadingState}
            className="flex items-center justify-center gap-3 bg-white text-black 
                      py-4 px-6 rounded-full hover:bg-gray-200 transition-colors"
          >
            {loadingState === 'wallet' ? (
              <svg className="animate-spin h-6 w-6 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <Image src={SOCIAL_ICONS.WALLET} alt="Wallet" width={24} height={24} />
                Connect Wallet
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default LoginHome;
