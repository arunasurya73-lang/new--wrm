import React, { useState, useEffect } from 'react';
import { Flame, Cloud, Layers, SunDim, Thermometer, Lock, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      id: 0,
      title: "Farmers burn fields",
      icon: Flame,
      iconColor: "text-red-500",
      glowColor: "rgba(239, 68, 68, 0.4)",
      desc: "Harvest remnants in Punjab/Haryana are set ablaze to clear soil rapidly.",
      stats: "Over 70 hotspots burning concurrently on high-density days."
    },
    {
      id: 1,
      title: "Smoke fills Delhi air",
      icon: Cloud,
      iconColor: "text-blue-400",
      glowColor: "rgba(96, 165, 250, 0.4)",
      desc: "Northwesterly seasonal winds transport heavy soot particles south-eastward.",
      stats: "Particulate travel distance exceeds 400+ kilometers."
    },
    {
      id: 2,
      title: "Inversion lid forms",
      icon: Layers,
      iconColor: "text-purple-400",
      glowColor: "rgba(192, 132, 252, 0.4)",
      desc: "Cool, heavy winter winds sink into the basin, trapping light warm air above.",
      stats: "Atmospheric boundary layer sits as low as 200 metres."
    },
    {
      id: 3,
      title: "Smoke blocks sunlight",
      icon: SunDim,
      iconColor: "text-amber-500",
      glowColor: "rgba(245, 158, 11, 0.4)",
      desc: "Thick, dark layer of aerosols reflects and scatters incoming solar radiation.",
      stats: "Soot blocks up to 40% of incident surface solar radiation."
    },
    {
      id: 4,
      title: "Ground stays cold",
      icon: Thermometer,
      iconColor: "text-cyan-400",
      glowColor: "rgba(34, 211, 238, 0.4)",
      desc: "No surface warming means no upward warm air currents form to clear the haze.",
      stats: "Ground temperatures drop, intensifying surface air pooling."
    },
    {
      id: 5,
      title: "Lid gets stronger",
      icon: Lock,
      iconColor: "text-indigo-400",
      glowColor: "rgba(129, 140, 248, 0.4)",
      desc: "The trapped smoke further blocks sun, reinforcing surface cold - locking the trap.",
      stats: "Pollution loads accumulate exponentially until wind shifts."
    }
  ];

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Page Title */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Why Delhi's Pollution Is a Trap</h1>
        <p className="text-xs text-textSecondary mt-1">Understanding the winter temperature inversion negative feedback loop</p>
      </div>

      {/* Main Cycle Diagram Container */}
      <div className="bg-cardBg border border-gray-850 rounded-card shadow-cardShadow p-6 lg:p-10 flex flex-col items-center justify-center">
        
        {/* Desktop Circular View (hidden on small screens) */}
        <div className="hidden lg:flex relative w-[520px] h-[520px] items-center justify-center">
          
          {/* SVG Arrow Paths behind the nodes */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" viewBox="0 0 520 520">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#374151" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#3B82F6" />
              </marker>
            </defs>
            
            {/* Arrow 0 -> 1 */}
            <path d="M 260 50 Q 380 70 450 160" fill="none" stroke={activeStep === 0 ? "#3B82F6" : "#1f2937"} strokeWidth={activeStep === 0 ? "3" : "1.5"} markerEnd={activeStep === 0 ? "url(#arrow-active)" : "url(#arrow)"} className="transition-all duration-500" />
            
            {/* Arrow 1 -> 2 */}
            <path d="M 450 160 Q 480 260 450 360" fill="none" stroke={activeStep === 1 ? "#3B82F6" : "#1f2937"} strokeWidth={activeStep === 1 ? "3" : "1.5"} markerEnd={activeStep === 1 ? "url(#arrow-active)" : "url(#arrow)"} className="transition-all duration-500" />
            
            {/* Arrow 2 -> 3 */}
            <path d="M 450 360 Q 380 450 260 470" fill="none" stroke={activeStep === 2 ? "#3B82F6" : "#1f2937"} strokeWidth={activeStep === 2 ? "3" : "1.5"} markerEnd={activeStep === 2 ? "url(#arrow-active)" : "url(#arrow)"} className="transition-all duration-500" />
            
            {/* Arrow 3 -> 4 */}
            <path d="M 260 470 Q 140 450 70 360" fill="none" stroke={activeStep === 3 ? "#3B82F6" : "#1f2937"} strokeWidth={activeStep === 3 ? "3" : "1.5"} markerEnd={activeStep === 3 ? "url(#arrow-active)" : "url(#arrow)"} className="transition-all duration-500" />
            
            {/* Arrow 4 -> 5 */}
            <path d="M 70 360 Q 40 260 70 160" fill="none" stroke={activeStep === 4 ? "#3B82F6" : "#1f2937"} strokeWidth={activeStep === 4 ? "3" : "1.5"} markerEnd={activeStep === 4 ? "url(#arrow-active)" : "url(#arrow)"} className="transition-all duration-500" />
            
            {/* Arrow 5 -> 0 */}
            <path d="M 70 160 Q 140 70 260 50" fill="none" stroke={activeStep === 5 ? "#3B82F6" : "#1f2937"} strokeWidth={activeStep === 5 ? "3" : "1.5"} markerEnd={activeStep === 5 ? "url(#arrow-active)" : "url(#arrow)"} className="transition-all duration-500" />
          </svg>

          {/* RENDER NODES */}
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            
            // Calculate absolute position on circle coordinates
            // R = 210, center = (260, 260)
            const angle = (step.id * 60 - 90) * (Math.PI / 180);
            const x = 260 + 205 * Math.cos(angle);
            const y = 260 + 205 * Math.sin(angle);

            return (
              <div
                key={step.id}
                className={`absolute how-it-works-node w-36 h-36 bg-[#0a0f1e] border-2 border-gray-850 rounded-full flex flex-col items-center justify-center p-3 text-center cursor-pointer ${
                  isActive ? 'active' : ''
                }`}
                style={{
                  left: `${x - 72}px`,
                  top: `${y - 72}px`,
                  boxShadow: isActive ? `0 0 25px ${step.glowColor}` : 'none'
                }}
                onClick={() => setActiveStep(step.id)}
              >
                <Icon className={`h-6 w-6 ${step.iconColor} ${isActive ? 'scale-110 animate-bounce' : ''} transition-transform duration-300`} />
                <h4 className="text-xs font-bold text-white mt-1.5 leading-tight">{step.title}</h4>
                <span className="text-[8px] text-gray-500 font-mono mt-0.5">Step {step.id + 1}</span>
              </div>
            );
          })}

          {/* Center explanation circle */}
          <div className="absolute w-40 h-40 rounded-full bg-[#0d1324] border border-gray-800 shadow-inner flex flex-col items-center justify-center p-4 text-center z-10">
            <Sparkles className="h-4 w-4 text-blue-400 mb-1" />
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest leading-none">Feedback Loop</h3>
            <p className="text-[9px] text-textSecondary mt-2 leading-relaxed font-sans">
              Click any outer stage of the loop to read details
            </p>
          </div>
        </div>

        {/* Mobile Linear View (visible on mobile / tablets) */}
        <div className="lg:hidden w-full space-y-4">
          <div className="bg-[#0c1222] border border-gray-850 p-4.5 rounded-lg mb-4 text-center">
            <Sparkles className="h-4.5 w-4.5 text-blue-400 mx-auto mb-1 animate-pulse" />
            <h3 className="text-sm font-bold text-white">Interactive Cycle Timeline</h3>
            <p className="text-xs text-textSecondary mt-1">Steps animate in sequence to explain the pollution trap.</p>
          </div>
          
          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full p-4 rounded-lg text-left border flex items-start space-x-3.5 transition-all ${
                    isActive
                      ? 'bg-blue-600/10 border-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.15)] scale-[1.01]'
                      : 'bg-[#080d19] border-gray-850 hover:border-gray-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg mt-0.5 ${isActive ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-900 text-textSecondary'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center">
                        Stage {step.id + 1}: {step.title}
                      </h4>
                      {isActive && (
                        <span className="text-[8px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                          Active Phase
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-textSecondary mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Step Detail Panel (below diagram) */}
        <div className="w-full max-w-xl mt-8 bg-[#0c1222] border border-gray-850 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4.5 animate-fadeIn">
          <div className="flex-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-blue-400 block mb-1">
              Active Stage Focus: Stage {steps[activeStep].id + 1}
            </span>
            <h4 className="text-sm font-bold text-white flex items-center">
              {steps[activeStep].title}
            </h4>
            <p className="text-xs text-textSecondary mt-1.5 leading-relaxed">
              {steps[activeStep].desc}
            </p>
          </div>
          <div className="bg-[#070b16] border border-gray-800/80 px-4 py-3.5 rounded-lg text-center min-w-[170px] flex flex-col justify-center">
            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider block">Observed Metric</span>
            <span className="text-xs font-bold text-blue-400 mt-1 leading-normal">{steps[activeStep].stats}</span>
          </div>
        </div>
      </div>

      {/* Static Info Stat Cards below diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 flex items-start space-x-3.5">
          <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500 mt-0.5">
            <SunDim className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Particulate Scattering</h4>
            <p className="text-[11px] text-textSecondary mt-1 leading-relaxed">
              PM2.5 blocks up to <strong>40%</strong> of sunlight on severe days, causing significant daytime surface cooling.
            </p>
          </div>
        </div>

        <div className="bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 flex items-start space-x-3.5">
          <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 mt-0.5">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Low Inversion Boundary</h4>
            <p className="text-[11px] text-textSecondary mt-1 leading-relaxed">
              Delhi's pollution lid can sit as low as <strong>200 metres</strong>, packing the entire capital's emissions into a tight layer.
            </p>
          </div>
        </div>

        <div className="bg-cardBg border border-gray-800 rounded-card shadow-cardShadow p-5 flex items-start space-x-3.5">
          <div className="p-2.5 bg-red-500/10 rounded-lg text-red-400 mt-0.5">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Long-Range Transport</h4>
            <p className="text-[11px] text-textSecondary mt-1 leading-relaxed">
              Smoke from Punjab crop fires travels over <strong>400+ km</strong>, carried by seasonal NW wind corridors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowItWorks;
