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
  X,
  Play
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
  const [minMin, setMinMin] = useState<number>(6);
  const [maxMin, setMaxMin] = useState<number>(14);
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
    if (isDrawing || !!cooldownEndTime || accumulatedResults.length >= numDraws) return;

    setIsDrawing(true);
    setLastDrawResult(null);
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
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFB7B2', '#B5EAD7', '#FF7F00']
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
          colors: ['#FFB7B2', '#FFDAC1', '#FFFFD1', '#B5EAD7', '#C7CEEA']
        });
      }, 1000);
    }
  };

  const totalMinutes = accumulatedResults.reduce((acc, curr) => acc + curr.minutes, 0);
  const isFinished = accumulatedResults.length === numDraws;

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32 overflow-x-hidden selection:bg-secondary-container">
      {/* Header */}
      <header className="bg-surface-bright shadow-[0_4px_20px_rgba(115,85,71,0.05)] w-full top-0 left-0 z-40 sticky mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-5 w-full">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => !isDrawing && setShowSettings(true)}>
            <div className="bg-secondary-container p-2 rounded-2xl group-hover:bg-secondary transition-colors">
              <Gamepad2 className="text-secondary group-hover:text-surface-bright w-6 h-6" />
            </div>
            <h1 className="font-headline font-black tracking-tight text-2xl text-on-background">遊戲時間抽獎機</h1>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="p-3 bg-surface-container-highest rounded-2xl hover:bg-secondary-container transition-colors text-on-surface-variant hover:text-secondary group"
            title="設定"
          >
            <Settings2 size={24} className="group-hover:rotate-45 transition-transform" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 flex flex-col items-center">

        {/* Configuration Display Section */}
        <section className="mb-10 w-full flex flex-col items-center">
          <div className="bg-surface-container-low border-2 border-surface-container rounded-full px-6 py-4 md:px-8 md:py-5 flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-6 shadow-sm max-w-2xl w-full justify-between">
            <p className="text-lg md:text-xl font-headline font-bold text-on-surface flex items-center gap-2">
              目前進度： <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">{accumulatedResults.length} / {numDraws}</span> 次
            </p>
            {accumulatedResults.length > 0 && (
              <div className="font-headline font-bold text-tertiary flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-full border-2 border-surface-container">
                已累積：
                <span className="text-secondary text-2xl font-black">{totalMinutes}</span>
                分鐘
              </div>
            )}
            {accumulatedResults.length === 0 && cooldownEndTime === null && (
              <button onClick={handleDrawStep} disabled={isDrawing || isFinished} className="tactile-3d-orange bg-secondary text-on-secondary font-headline font-bold px-6 py-2 rounded-full flex items-center gap-2 hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed hidden md:flex">
                <span>🚀 開始</span>
              </button>
            )}
          </div>
        </section>

        {/* Main Draw Interaction Area */}
        <section className="mb-16 w-full relative">
          <div className="relative flex justify-center">
            {/* Ambient Behind Glow */}
            <div className="absolute inset-0 bg-secondary-container blur-[100px] opacity-30 rounded-full animate-pulse pointer-events-none w-[300px] h-[300px] mx-auto top-1/2 -translate-y-1/2" />

            {/* Large Draw Button Card */}
            <div className="bg-surface-container-lowest p-8 md:p-12 rounded-[3rem] shadow-[0_20px_40px_rgba(115,85,71,0.08)] w-full max-w-md aspect-square flex flex-col items-center justify-center border-4 border-surface-container-highest relative overflow-hidden group z-10">
              {/* Decorative Dotted Background inside the card */}
              <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: "radial-gradient(var(--color-secondary) 2px, transparent 2px)", backgroundSize: "24px 24px" }}></div>

              {isDrawing ? (
                <div className="w-full h-full relative z-10 rounded-full overflow-hidden border-8 border-secondary-container shadow-inner">
                  <BallPit
                    onAnimationEnd={onAnimationFinished}
                    duration={animDurationSec * 1000}
                    windForce={windForce}
                  />
                </div>
              ) : isFinished ? (
                <div className="flex flex-col items-center gap-4 relative z-10">
                  <div className="bg-surface-container-low p-6 rounded-full">
                    <Trophy className="text-secondary w-20 h-20" />
                  </div>
                  <span className="font-headline font-black text-3xl text-on-surface">抽獎已結束</span>
                  <button
                    onClick={startNewSession}
                    className="tactile-3d-orange bg-secondary text-on-secondary px-8 py-3 rounded-full font-headline font-bold mt-2 hover:scale-105 transition-transform"
                  >
                    重新開始
                  </button>
                </div>
              ) : cooldownEndTime ? (
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className="bg-surface-container p-5 rounded-full mb-2">
                    <Clock className="text-outline w-16 h-16" />
                  </div>
                  <span className="font-headline font-bold text-2xl text-on-surface-variant tracking-wider">冷卻中</span>
                  <span className="font-headline font-black text-4xl text-error">{countdown}</span>
                  {lastTotalMinutes !== null && (
                    <div className="bg-surface-container-low px-4 py-2 rounded-full mt-2 font-body font-bold text-sm text-tertiary">
                      上次總計：{lastTotalMinutes} 分鐘
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleDrawStep}
                  className="w-56 h-56 md:w-64 md:h-64 rounded-full bg-secondary tactile-3d-orange flex flex-col items-center justify-center text-on-secondary hover:scale-105 active:scale-95 transition-all z-10 shadow-lg"
                >
                  <Sparkles className="w-16 h-16 mb-2" />
                  <span className="font-headline font-black text-4xl tracking-widest">點擊抽獎</span>
                  <span className="mt-3 font-body font-medium bg-on-secondary text-secondary px-4 py-1 rounded-full text-sm">
                    第 {accumulatedResults.length + 1} 次
                  </span>
                </button>
              )}
            </div>

            {/* Last Result Pop-up (Like Mario Coins) */}
            <AnimatePresence>
              {lastDrawResult !== null && !isDrawing && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 50, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, y: -140, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, y: -200 }}
                  className="absolute left-1/2 -translate-x-1/2 z-20 bg-surface-container-lowest px-8 py-4 rounded-full shadow-2xl border-4 border-secondary-container flex items-center gap-3 transform"
                >
                  <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center">
                    <Clock className="text-secondary" size={24} />
                  </div>
                  <span className="text-3xl font-headline font-black text-secondary">+{lastDrawResult} 分鐘</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Result Piles Area (mimicking the coffee bean piles) */}
        <section className="mb-20 w-full">
          <h2 className="font-headline font-bold text-2xl mb-8 text-on-surface flex items-center gap-3">
            <span className="bg-tertiary-container text-tertiary p-2 rounded-xl">
              <Dices size={24} />
            </span>
            抽獎結果一覽
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: numDraws }).map((_, idx) => {
              const res = accumulatedResults[idx];
              if (res) {
                // Filled State
                return (
                  <motion.div
                    key={res.id}
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="bg-surface-container-lowest border-2 border-dashed border-tertiary p-6 md:p-8 rounded-[2rem] relative min-h-[160px] flex flex-col justify-between shadow-sm"
                  >
                    <span className="font-headline font-black text-6xl text-secondary absolute -top-4 -right-2 opacity-[0.08] pointer-events-none z-0">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <p className="font-headline font-bold text-tertiary uppercase tracking-wider text-sm z-10 relative">第 {idx + 1} 次</p>
                    <div className="flex items-end justify-center z-10 relative mt-4">
                      <span className="font-headline font-black text-6xl md:text-7xl text-secondary">{res.minutes}</span>
                      <span className="mb-2 ml-1 font-bold text-tertiary text-lg">分</span>
                    </div>
                  </motion.div>
                );
              } else {
                // Empty State
                return (
                  <div
                    key={idx}
                    className="bg-surface-container-low/50 border-2 border-dashed border-outline-variant p-6 md:p-8 rounded-[2rem] relative min-h-[160px] flex items-center justify-center group"
                  >
                    <p className="font-headline font-bold text-outline uppercase tracking-wider text-sm absolute top-6 left-6 md:opacity-0 group-hover:opacity-100 transition-opacity">第 {idx + 1} 次</p>
                    <Sparkles className="text-outline-variant w-10 h-10 opacity-40 group-hover:scale-110 group-hover:opacity-60 transition-all" />
                  </div>
                );
              }
            })}
          </div>
        </section>
      </main>

      {/* Settings Modal (Updated styling) */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-[#342e20]/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              className="relative bg-surface h-full max-h-[90vh] w-full max-w-md rounded-[2.5rem] p-8 md:p-10 shadow-2xl border-[12px] border-surface-container-highest flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 text-tertiary">
                  <div className="bg-tertiary-container p-3 rounded-2xl">
                    <Settings2 size={24} />
                  </div>
                  <h2 className="font-headline font-black text-2xl">參數設定</h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-3 bg-surface-container-low hover:bg-surface-container rounded-full transition-colors text-outline"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-headline font-bold text-on-surface-variant">
                    <Clock size={16} className="text-secondary" /> 單次最小分鐘數
                  </label>
                  <input
                    type="number"
                    value={minMin}
                    onChange={(e) => setMinMin(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border-2 border-surface-container rounded-2xl px-5 py-4 focus:outline-none focus:border-secondary font-headline font-bold text-on-surface text-lg shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-headline font-bold text-on-surface-variant">
                    <Clock size={16} className="text-secondary" /> 單次最大分鐘數
                  </label>
                  <input
                    type="number"
                    value={maxMin}
                    onChange={(e) => setMaxMin(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border-2 border-surface-container rounded-2xl px-5 py-4 focus:outline-none focus:border-secondary font-headline font-bold text-on-surface text-lg shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-headline font-bold text-on-surface-variant">
                    <Dices size={16} className="text-primary" /> 抽獎次數 (n)
                  </label>
                  <input
                    type="number"
                    value={numDraws}
                    onChange={(e) => setNumDraws(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border-2 border-surface-container rounded-2xl px-5 py-4 focus:outline-none focus:border-primary font-headline font-bold text-on-surface text-lg shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-headline font-bold text-on-surface-variant">
                    <Sparkles size={16} className="text-tertiary" /> 球池風力強度
                  </label>
                  <input
                    type="number"
                    value={windForce}
                    onChange={(e) => setWindForce(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border-2 border-surface-container rounded-2xl px-5 py-4 focus:outline-none focus:border-tertiary font-headline font-bold text-on-surface text-lg shadow-inner"
                  />
                  <p className="text-xs font-body font-medium text-outline mt-1 ml-1">建議值：10 ~ 50 (強風)</p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-headline font-bold text-on-surface-variant">
                    <Play size={16} className="text-error" /> 動畫長度 (秒)
                  </label>
                  <input
                    type="number"
                    value={animDurationSec}
                    onChange={(e) => setAnimDurationSec(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border-2 border-surface-container rounded-2xl px-5 py-4 focus:outline-none focus:border-error font-headline font-bold text-on-surface text-lg shadow-inner"
                  />
                  <p className="text-xs font-body font-medium text-outline mt-1 ml-1">建議值：3 ~ 10 秒</p>
                </div>

                {error && (
                  <div className="p-4 bg-error-container/20 border-2 border-error-container rounded-2xl flex items-start gap-3 text-error text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="font-body font-bold">{error}</p>
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
                className="mt-8 w-full tactile-3d-green bg-primary hover:bg-primary-dim text-on-primary font-headline font-black text-lg py-5 rounded-[2rem] transition-all flex items-center justify-center gap-2"
              >
                儲存設定並重新開始 <ChevronRight size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Final Summary Modal (Updated styling) */}
      <AnimatePresence>
        {showFinalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#342e20]/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: 5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 100 }}
              className="relative bg-surface rounded-[3rem] p-10 md:p-14 w-full max-w-2xl shadow-[0_30px_60px_rgba(0,0,0,0.2)] border-8 border-surface-container-highest text-center overflow-hidden"
            >
              {/* Fun background pattern */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(var(--color-outline) 2px, transparent 2px)", backgroundSize: "30px 30px" }}></div>
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-secondary-container rounded-full opacity-50 blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-28 h-28 bg-surface-container-lowest shadow-lg rounded-full mb-8 border-4 border-surface-container">
                  <Trophy size={56} className="text-secondary" />
                </div>

                <h2 className="font-headline text-5xl font-black text-on-surface mb-4">抽獎大成功！</h2>
                <p className="font-body font-bold text-tertiary mb-10 text-lg">這是您今天努力獲得的時數清單</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                  {accumulatedResults.map((res) => (
                    <motion.div
                      key={res.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: res.id * 0.1 }}
                      className="bg-surface-container-lowest rounded-3xl p-5 border-2 border-surface-container shadow-sm"
                    >
                      <span className="font-headline text-sm text-outline block mb-1 font-bold">第 {res.id} 次</span>
                      <span className="font-headline text-4xl font-black text-on-surface flex items-baseline justify-center gap-1">
                        {res.minutes} <span className="text-base font-bold text-tertiary">分</span>
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-secondary rounded-[3rem] p-10 text-on-secondary shadow-[0_8px_30px_var(--color-secondary-container)] mb-10 border-4 border-on-secondary-fixed-variant border-b-8">
                  <span className="font-headline text-xl font-bold opacity-90 block mb-2 tracking-wide">總計獲得時間</span>
                  <div className="font-headline text-8xl font-black flex items-center justify-center gap-4 drop-shadow-md">
                    {totalMinutes} <span className="text-3xl opacity-90">分鐘</span>
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => setShowFinalModal(false)}
                    className="flex-1 tactile-3d-purple bg-surface-container text-tertiary font-headline font-black text-xl py-6 rounded-full transition-all flex items-center justify-center gap-3 hover:brightness-95"
                  >
                    關閉
                  </button>
                  <button
                    onClick={startNewSession}
                    className="flex-[2] tactile-3d-orange bg-secondary text-on-secondary font-headline font-black text-xl py-6 rounded-full transition-all flex items-center justify-center gap-3"
                  >
                    <RotateCcw size={28} /> 儲存並重新開始
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
