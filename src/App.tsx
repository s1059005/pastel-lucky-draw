/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2, 
  Dices, 
  Clock, 
  Trophy, 
  AlertCircle, 
  Sparkles,
  Gamepad2,
  RotateCcw,
  ChevronRight,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import BallPit from './components/BallPit';

// --- Types ---
interface DrawResult {
  id: number;
  minutes: number;
}

export default function App() {
  // --- Config State ---
  const [minMin, setMinMin] = useState<number>(5);
  const [maxMin, setMaxMin] = useState<number>(15);
  const [numDraws, setNumDraws] = useState<number>(2);
  const [windForce, setWindForce] = useState<number>(20); // Default to 20 for strong wind
  const [animDurationSec, setAnimDurationSec] = useState<number>(8); // Default to 8 seconds
  
  // --- UI State ---
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: Ready, 1..n: Drawing steps
  const [accumulatedResults, setAccumulatedResults] = useState<DrawResult[]>([]);
  const [lastDrawResult, setLastDrawResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);

  // --- Cooldown State ---
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('cooldownEndTime');
    if (saved) {
      const time = parseInt(saved, 10);
      if (time > Date.now()) return time;
      localStorage.removeItem('cooldownEndTime');
    }
    return null;
  });
  const [countdown, setCountdown] = useState<string>('');
  const [lastTotalMinutes, setLastTotalMinutes] = useState<number | null>(() => {
    const saved = localStorage.getItem('lastTotalMinutes');
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (!cooldownEndTime) return;
    const updateCountdown = () => {
      const now = Date.now();
      const diff = cooldownEndTime - now;
      if (diff <= 0) {
        setCooldownEndTime(null);
        localStorage.removeItem('cooldownEndTime');
        setCountdown('');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCountdown(`${minutes}分 ${seconds.toString().padStart(2, '0')}秒`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [cooldownEndTime]);

  // --- Validation ---
  const validateParams = useCallback(() => {
    if (minMin >= maxMin) return "最小分鐘數必須小於最大分鐘數唷！";
    return null;
  }, [minMin, maxMin]);

  // --- Auto-hide Popup ---
  useEffect(() => {
    if (lastDrawResult !== null) {
      const timer = setTimeout(() => {
        setLastDrawResult(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastDrawResult]);

  // --- Handlers ---
  const startNewSession = () => {
    const validationError = validateParams();
    if (validationError) {
      setError(validationError);
      setShowSettings(true);
      return;
    }
    setError(null);
    setAccumulatedResults([]);
    setCurrentStep(0);
    setLastDrawResult(null);
    setShowFinalModal(false);
  };

  const handleDrawStep = () => {
    if (isDrawing) return;
    
    setIsDrawing(true);
    setLastDrawResult(null);

    // BallPit triggers the state update when animation ends
  };

  const onAnimationFinished = () => {
    const minutes = Math.floor(Math.random() * (maxMin - minMin + 1)) + minMin;
    
    const newResult = { id: accumulatedResults.length + 1, minutes };
    const updatedResults = [...accumulatedResults, newResult];
    
    setAccumulatedResults(updatedResults);
    setLastDrawResult(minutes);
    setIsDrawing(false);
    setCurrentStep(prev => prev + 1);

    // Small confetti for each step
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#FFB7B2', '#B5EAD7']
    });

    // If finished all n draws
    if (updatedResults.length === numDraws) {
      const endTime = Date.now() + 30 * 60 * 1000; // 30 minutes cooldown
      setCooldownEndTime(endTime);
      localStorage.setItem('cooldownEndTime', endTime.toString());

      const currentTotal = updatedResults.reduce((acc, curr) => acc + curr.minutes, 0);
      setLastTotalMinutes(currentTotal);
      localStorage.setItem('lastTotalMinutes', currentTotal.toString());

      setTimeout(() => {
        setShowFinalModal(true);
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA']
        });
      }, 1000);
    }
  };

  const totalMinutes = accumulatedResults.reduce((acc, curr) => acc + curr.minutes, 0);
  const isFinished = accumulatedResults.length === numDraws;

  return (
    <div className="min-h-screen bg-[#FFF9F5] font-sans text-[#5D5D5D] p-4 md:p-8 selection:bg-pink-100 overflow-x-hidden">
      {/* Header */}
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <Gamepad2 className="text-pink-400 w-8 h-8" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#FF85A1]">
            遊戲時間抽獎機
          </h1>
        </div>
        
        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all text-pink-400 hover:scale-105 active:scale-95 border-2 border-pink-50"
        >
          <Settings2 size={24} />
        </button>
      </header>

      <main className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        {/* Progress Indicator */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-4"
        >
          <div className="px-6 py-2 bg-pink-100 rounded-full text-pink-500 font-bold text-sm shadow-sm">
            進度：{accumulatedResults.length} / {numDraws} 次
          </div>
          {accumulatedResults.length > 0 && (
            <div className="px-6 py-2 bg-blue-100 rounded-full text-blue-500 font-bold text-sm shadow-sm">
              目前累計：{totalMinutes} 分
            </div>
          )}
        </motion.div>

        {/* Interaction Area */}
        <div className="relative">
          <div className="absolute inset-0 bg-pink-200 blur-[120px] opacity-20 rounded-full animate-pulse" />
          
          <motion.div
            animate={{}}
            transition={{ repeat: 0 }}
            className="relative z-10"
          >
            <button
              onClick={handleDrawStep}
              disabled={isDrawing || isFinished || !!cooldownEndTime}
              className={`
                group relative w-72 h-72 md:w-96 md:h-96 rounded-full 
                flex flex-col items-center justify-center gap-4
                transition-all duration-500
                ${isDrawing 
                  ? 'bg-gradient-to-br from-pink-300 to-pink-400 cursor-not-allowed' 
                  : cooldownEndTime
                    ? 'bg-gray-50 cursor-not-allowed border-8 border-gray-200'
                  : isFinished
                    ? 'bg-gray-100 cursor-default border-8 border-gray-200'
                    : 'bg-white hover:bg-pink-50 cursor-pointer shadow-2xl shadow-pink-200/50 border-8 border-pink-100'
                }
              `}
            >
              {isDrawing ? (
                <BallPit 
                  onAnimationEnd={onAnimationFinished} 
                  duration={animDurationSec * 1000} 
                  windForce={windForce}
                />
              ) : cooldownEndTime ? (
                <div className="flex flex-col items-center gap-2">
                  <Clock className="text-gray-400 w-24 h-24 mb-2" />
                  <span className="text-gray-500 font-bold text-xl">冷卻中</span>
                  <span className="text-pink-500 font-black text-3xl md:text-4xl">{countdown}</span>
                  {lastTotalMinutes !== null && (
                    <span className="text-blue-500 font-bold mt-1 text-sm bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      上次抽中總計：{lastTotalMinutes} 分鐘
                    </span>
                  )}
                  <span className="text-gray-400 text-sm mt-2">休息一下再繼續吧！</span>
                </div>
              ) : isFinished ? (
                <div className="flex flex-col items-center gap-2">
                  <Trophy className="text-gray-300 w-24 h-24" />
                  <span className="text-gray-400 font-bold text-xl">抽獎已結束</span>
                  <button 
                    onClick={startNewSession}
                    className="mt-4 px-6 py-2 bg-pink-400 text-white rounded-xl text-sm font-bold hover:bg-pink-500 transition-colors"
                  >
                    重新開始
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-36 h-36 md:w-48 md:h-48 bg-pink-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <motion.div
                      animate={{ y: [0, -15, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Sparkles className="text-pink-400 w-20 h-20 md:w-24 md:h-24" />
                    </motion.div>
                  </div>
                  <div className="text-center">
                    <span className="text-pink-500 font-black text-3xl md:text-4xl block">
                      第 {accumulatedResults.length + 1} 次抽獎
                    </span>
                    <span className="text-pink-300 font-bold text-sm mt-1 block">點擊開始！</span>
                  </div>
                </>
              )}
            </button>
          </motion.div>

          {/* Last Result Pop-up */}
          <AnimatePresence>
            {lastDrawResult !== null && !isDrawing && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: -120 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute left-1/2 -translate-x-1/2 z-20 bg-white px-8 py-4 rounded-3xl shadow-xl border-4 border-blue-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="text-blue-500" size={20} />
                </div>
                <span className="text-2xl font-black text-blue-600">+{lastDrawResult} 分鐘</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-pink-900/20 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              className="relative bg-white h-full max-h-[90vh] w-full max-w-md rounded-[40px] p-8 shadow-2xl border-8 border-pink-50 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-[#FF85A1]">
                  <Settings2 size={24} />
                  <h2 className="font-black text-2xl">參數設定</h2>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-pink-50 rounded-full transition-colors text-gray-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-500">
                    <Clock size={16} className="text-blue-300" /> 單次最小分鐘數
                  </label>
                  <input 
                    type="number" 
                    value={minMin}
                    onChange={(e) => setMinMin(Number(e.target.value))}
                    className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-300 font-bold text-blue-600 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-500">
                    <Clock size={16} className="text-orange-300" /> 單次最大分鐘數
                  </label>
                  <input 
                    type="number" 
                    value={maxMin}
                    onChange={(e) => setMaxMin(Number(e.target.value))}
                    className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-300 font-bold text-orange-600 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-500">
                    <Dices size={16} className="text-purple-300" /> 抽獎次數 (n)
                  </label>
                  <input 
                    type="number" 
                    value={numDraws}
                    onChange={(e) => setNumDraws(Number(e.target.value))}
                    className="w-full bg-purple-50 border-2 border-purple-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-300 font-bold text-purple-600 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-500">
                    <Sparkles size={16} className="text-teal-300" /> 球池風力強度
                  </label>
                  <input 
                    type="number" 
                    value={windForce}
                    onChange={(e) => setWindForce(Number(e.target.value))}
                    className="w-full bg-teal-50 border-2 border-teal-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-teal-300 font-bold text-teal-600 text-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1">建議值：10 ~ 50 (強風)</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-500">
                    <Clock size={16} className="text-indigo-300" /> 動畫長度 (秒)
                  </label>
                  <input 
                    type="number" 
                    value={animDurationSec}
                    onChange={(e) => setAnimDurationSec(Number(e.target.value))}
                    className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-300 font-bold text-indigo-600 text-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1">建議值：3 ~ 10 秒</p>
                </div>



                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-start gap-3 text-red-500 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="font-medium">{error}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  const err = validateParams();
                  if (err) {
                    setError(err);
                  } else {
                    startNewSession();
                    setShowSettings(false);
                  }
                }}
                className="mt-8 w-full bg-pink-400 hover:bg-pink-500 text-white font-black py-5 rounded-3xl transition-all shadow-lg shadow-pink-200 flex items-center justify-center gap-2"
              >
                儲存並重新開始 <ChevronRight size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Final Summary Modal */}
      <AnimatePresence>
        {showFinalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-pink-900/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative bg-white rounded-[50px] p-10 md:p-14 w-full max-w-2xl shadow-2xl border-8 border-pink-50 text-center"
            >
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-pink-100 rounded-full opacity-30 blur-2xl" />
              
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 rounded-full mb-8">
                  <Trophy size={48} className="text-yellow-500" />
                </div>
                
                <h2 className="text-4xl font-black text-gray-700 mb-4">抽獎大成功！</h2>
                <p className="text-gray-400 font-medium mb-10">這是您今天的冒險時數清單：</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
                  {accumulatedResults.map((res) => (
                    <motion.div 
                      key={res.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: res.id * 0.1 }}
                      className="bg-gray-50 rounded-3xl p-5 border-2 border-gray-100"
                    >
                      <span className="text-xs text-gray-400 block mb-1 font-bold">第 {res.id} 次</span>
                      <span className="text-2xl font-black text-gray-700">{res.minutes} <span className="text-sm font-normal">分</span></span>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-pink-400 to-pink-500 rounded-[40px] p-10 text-white shadow-2xl shadow-pink-200 mb-10">
                  <span className="text-lg font-bold opacity-80 block mb-2">總計獲得遊戲時間</span>
                  <div className="text-7xl font-black flex items-center justify-center gap-3">
                    {totalMinutes} <span className="text-2xl opacity-90">分鐘</span>
                  </div>
                </div>

                <button
                  onClick={startNewSession}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} /> 完成並返回
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto text-center text-gray-300 text-xs font-medium py-8">
        © 2026 遊戲時間抽獎機 · 祝您遊戲愉快 (´▽`ʃ♡ƪ)
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #FFE5EC;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
