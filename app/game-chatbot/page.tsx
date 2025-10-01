'use client'

import GameChatbot from '@/components/GameChatbot'
import { Footer } from '@/components/footer'
import { Gamepad2, Trophy, Target, Gift, Zap, Users, Crown, Flame } from 'lucide-react'

export default function GameChatbotPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Animated background with red accents */}
      <div className="absolute inset-0">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-red-950/30 to-black"></div>
        
        {/* Floating red particles */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-red-500 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
        
        {/* Red gradient orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-red-600 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-60 right-20 w-72 h-72 bg-red-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-red-700 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255, 0, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 0, 0, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      <div className="relative z-10">
        <main className="container mx-auto px-4 py-12">
          {/* Enhanced Header Section */}
          <div className="text-center mb-16">
            {/* Animated gaming icon with multiple rings */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-2 bg-red-500 rounded-full animate-pulse opacity-30"></div>
                <div className="absolute inset-4 bg-red-400 rounded-full animate-pulse opacity-40"></div>
                <div className="relative p-8 bg-gradient-to-br from-red-600 via-red-700 to-black rounded-full shadow-2xl border-2 border-red-500/30">
                  <Gamepad2 className="h-16 w-16 text-white animate-bounce-subtle" />
                </div>
              </div>
            </div>

            {/* Epic title with glitch effect */}
            <div className="space-y-6 mb-10">
              <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-white via-red-200 to-red-400 bg-clip-text text-transparent mb-6 tracking-tight relative">
                <span className="block">MOVIE TRIVIA</span>
                <span className="block text-5xl md:text-7xl bg-gradient-to-r from-red-500 via-red-400 to-white bg-clip-text text-transparent">
                  CHALLENGE
                </span>
                {/* Glow effect */}
                <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-red-600/20 to-red-400/20 -z-10"></div>
              </h1>
              
              {/* Animated divider */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-1 w-32 bg-gradient-to-r from-red-600 to-red-400 rounded-full"></div>
                  <div className="absolute inset-0 h-1 w-32 bg-gradient-to-r from-red-600 to-red-400 rounded-full animate-pulse blur-sm"></div>
                </div>
              </div>
            </div>

            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
              🎮 <span className="text-red-400 font-bold">Test your movie knowledge</span> and dominate the leaderboard! 
              Answer trivia questions correctly to unlock rewards and become the ultimate <span className="text-red-300 font-semibold">Movie Master</span>.
            </p>

            {/* Gaming stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
              <div className="group text-center p-4 bg-red-950/30 backdrop-blur-sm border border-red-500/20 rounded-2xl hover:border-red-400/50 transition-all duration-300 hover:transform hover:scale-105">
                <div className="flex justify-center mb-3">
                  <Flame className="h-8 w-8 text-red-500 group-hover:animate-pulse" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">1000+</div>
                <div className="text-sm text-gray-400">Questions</div>
              </div>
              <div className="group text-center p-4 bg-red-950/30 backdrop-blur-sm border border-red-500/20 rounded-2xl hover:border-red-400/50 transition-all duration-300 hover:transform hover:scale-105">
                <div className="flex justify-center mb-3">
                  <Users className="h-8 w-8 text-red-400 group-hover:animate-pulse" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">25K+</div>
                <div className="text-sm text-gray-400">Players</div>
              </div>
              <div className="group text-center p-4 bg-red-950/30 backdrop-blur-sm border border-red-500/20 rounded-2xl hover:border-red-400/50 transition-all duration-300 hover:transform hover:scale-105">
                <div className="flex justify-center mb-3">
                  <Crown className="h-8 w-8 text-red-300 group-hover:animate-pulse" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">50+</div>
                <div className="text-sm text-gray-400">Achievements</div>
              </div>
              <div className="group text-center p-4 bg-red-950/30 backdrop-blur-sm border border-red-500/20 rounded-2xl hover:border-red-400/50 transition-all duration-300 hover:transform hover:scale-105">
                <div className="flex justify-center mb-3">
                  <Zap className="h-8 w-8 text-red-600 group-hover:animate-pulse" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">24/7</div>
                <div className="text-sm text-gray-400">Online</div>
              </div>
            </div>
          </div>

          {/* Enhanced Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="group relative overflow-hidden bg-gradient-to-br from-red-950/50 to-black/50 backdrop-blur-sm border border-red-500/30 rounded-3xl p-8 hover:border-red-400/60 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-red-600/20">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative text-center">
                <div className="p-4 bg-gradient-to-br from-red-600 to-red-700 rounded-full w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Earn Points</h3>
                <p className="text-gray-300 leading-relaxed">Answer questions correctly to earn points and build your legendary score! Each victory brings you closer to greatness.</p>
                <div className="mt-4 inline-flex items-center text-red-400 text-sm font-semibold">
                  <span>5-15 points per question</span>
                  <Zap className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-red-950/50 to-black/50 backdrop-blur-sm border border-red-500/30 rounded-3xl p-8 hover:border-red-400/60 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-red-600/20">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative text-center">
                <div className="p-4 bg-gradient-to-br from-red-600 to-red-700 rounded-full w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Build Streaks</h3>
                <p className="text-gray-300 leading-relaxed">Get consecutive answers right for massive bonus points and exclusive achievements! Maintain your winning streak.</p>
                <div className="mt-4 inline-flex items-center text-red-400 text-sm font-semibold">
                  <span>Bonus every 3+ streak</span>
                  <Flame className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-red-950/50 to-black/50 backdrop-blur-sm border border-red-500/30 rounded-3xl p-8 hover:border-red-400/60 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-red-600/20">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative text-center">
                <div className="p-4 bg-gradient-to-br from-red-600 to-red-700 rounded-full w-fit mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Gift className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Unlock Rewards</h3>
                <p className="text-gray-300 leading-relaxed">Reach epic point milestones to unlock special badges, titles, and exclusive content! Show off your achievements.</p>
                <div className="mt-4 inline-flex items-center text-red-400 text-sm font-semibold">
                  <span>50+ unique rewards</span>
                  <Crown className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Game Chatbot with Enhanced Container */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="relative">
              {/* Glow effect behind chatbot */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-red-500/5 to-red-600/10 rounded-3xl blur-3xl"></div>
              <div className="relative bg-black/60 backdrop-blur-lg border border-red-500/30 rounded-3xl p-8 shadow-2xl">
                <div className="absolute top-4 left-4 flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse animation-delay-200"></div>
                  <div className="w-3 h-3 bg-red-300 rounded-full animate-pulse animation-delay-400"></div>
                </div>
                <GameChatbot />
              </div>
            </div>
          </div>

          {/* Enhanced Instructions */}
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden bg-gradient-to-br from-red-950/30 to-black/50 backdrop-blur-lg border border-red-500/30 rounded-3xl p-10 shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
              
              <h3 className="text-3xl font-bold text-white mb-8 flex items-center">
                <div className="p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl mr-4">
                  <Gamepad2 className="h-8 w-8 text-white" />
                </div>
                Game Instructions
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-xl font-semibold text-red-400 mb-4">Getting Started</h4>
                  <div className="space-y-4 text-gray-300">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">1</div>
                      <p>Type <code className="bg-red-600/20 border border-red-500/30 px-3 py-1 rounded-lg text-red-300 font-mono">'start'</code> to begin your first trivia question</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">2</div>
                      <p>Click on your answer choice from the multiple options provided</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">3</div>
                      <p>Earn points for correct answers (5-15 points per question)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xl font-semibold text-red-400 mb-4">Pro Tips</h4>
                  <div className="space-y-4 text-gray-300">
                    <div className="flex items-start space-x-3">
                      <Flame className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                      <p>Build streaks for bonus points (every 3+ correct answers in a row)</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Trophy className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                      <p>Use commands: <code className="bg-red-600/20 px-2 py-1 rounded text-red-300 font-mono text-sm">'stats'</code>, <code className="bg-red-600/20 px-2 py-1 rounded text-red-300 font-mono text-sm">'rewards'</code>, <code className="bg-red-600/20 px-2 py-1 rounded text-red-300 font-mono text-sm">'help'</code></p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Crown className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                      <p>Unlock special badges and titles as you reach point milestones!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to action */}
              <div className="mt-10 text-center">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer border border-red-500/30">
                  <Gamepad2 className="h-6 w-6" />
                  <span>START PLAYING NOW</span>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}