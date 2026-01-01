import React, { useState } from 'react';
import { Layers, Ruler, Download, ArrowDownToLine } from 'lucide-react';
import Staircase3D from './components/Staircase3D';
import { StairConfig } from './types';

const DEFAULT_CONFIG: StairConfig = {
  totalHeight: 280, // Standard floor height in cm
  width: 90,       // Standard stair width in cm
  numSteps: 14,    // ~20cm riser
  stepDepth: 25,   // ~25cm tread
  slabThickness: 20, // Default concrete thickness
  landingStep: 0,    // 0 = no landing
  landingDepth: 90,  // Standard landing depth
};

export default function App() {
  const [config, setConfig] = useState<StairConfig>(DEFAULT_CONFIG);
  const [showDimensions, setShowDimensions] = useState(true);

  const handleInputChange = (key: keyof StairConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const stepHeight = (config.totalHeight / config.numSteps).toFixed(1);
  
  // Calculate total run including landing if present
  let calculatedRun = (config.numSteps - 1) * config.stepDepth;
  if (config.landingStep > 0 && config.landingStep <= config.numSteps) {
    // If there is a landing, one "step depth" is replaced by "landing depth"
    // However, usually the landing is ONE of the steps (the flat part).
    // If landingStep is the Nth step, its run is landingDepth instead of stepDepth.
    // The total run is sum of all runs.
    // Logic: (NumSteps * StepDepth) - StepDepth + LandingDepth? 
    // Usually total run = Sum of all treads. Last riser doesn't add run usually unless nosing.
    // In our model: Total Run = sum of (NumSteps) treads/landings.
    // We treat the top floor as arrival, so NumSteps treads are drawn? 
    // Actually in the 3D model we draw NumSteps runs.
    // Let's match the 3D model logic:
    calculatedRun = 0;
    for (let i = 1; i <= config.numSteps; i++) {
        calculatedRun += (i === config.landingStep) ? config.landingDepth : config.stepDepth;
    }
    // Usually the last "tread" is the floor arrival, but our 3D model draws it.
    // If we count "ingombro a terra", it's usually excluding the last step if it's flush with floor, 
    // but here we visualize the whole structure. Let's keep consistency with the shape width.
  } else {
      calculatedRun = config.numSteps * config.stepDepth;
  }

  const slope = (Math.atan(config.totalHeight / calculatedRun) * (180 / Math.PI)).toFixed(1);

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Create a temporary link
      const link = document.createElement('a');
      link.download = 'scala-3d.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* LEFT PANEL: CONTROLS */}
      {/* Mobile: Order 2 (Bottom), Height 55% */}
      {/* Desktop: Order 1 (Left), Height 100%, Width 96 (24rem) */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg order-2 md:order-1 h-[55%] md:h-full overflow-y-auto">
        <div className="p-4 md:p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            StairGen
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configuratore Scale 3D</p>
        </div>

        <div className="flex-1 p-4 md:p-6 space-y-6 md:space-y-8 pb-24 md:pb-6">
          
          {/* Dimensions Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Ruler className="w-4 h-4" />
                <h2>Dimensioni</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={showDimensions}
                  onChange={(e) => setShowDimensions(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500 font-medium group-hover:text-blue-600 transition-colors">Mostra quote</span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Altezza Totale (cm)</label>
                <input 
                  type="range" min="50" max="500" step="1"
                  value={config.totalHeight}
                  onChange={(e) => handleInputChange('totalHeight', parseInt(e.target.value))}
                  className="w-full accent-blue-600 mb-2"
                />
                <div className="flex justify-between">
                  <input 
                    type="number" 
                    value={config.totalHeight}
                    onChange={(e) => handleInputChange('totalHeight', parseInt(e.target.value))}
                    className="w-20 p-1 border rounded text-sm text-right font-mono"
                  />
                  <span className="text-xs text-slate-400 self-center">Da pavimento a pavimento</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Larghezza Scala (cm)</label>
                <input 
                  type="range" min="60" max="250" step="1"
                  value={config.width}
                  onChange={(e) => handleInputChange('width', parseInt(e.target.value))}
                  className="w-full accent-blue-600 mb-2"
                />
                <input 
                    type="number" 
                    value={config.width}
                    onChange={(e) => handleInputChange('width', parseInt(e.target.value))}
                    className="w-20 p-1 border rounded text-sm text-right font-mono block ml-auto"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Numero Gradini</label>
                <input 
                  type="range" min="3" max="50" step="1"
                  value={config.numSteps}
                  onChange={(e) => handleInputChange('numSteps', parseInt(e.target.value))}
                  className="w-full accent-blue-600 mb-2"
                />
                 <input 
                    type="number" 
                    value={config.numSteps}
                    onChange={(e) => handleInputChange('numSteps', parseInt(e.target.value))}
                    className="w-20 p-1 border rounded text-sm text-right font-mono block ml-auto"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Profondità Pedata (cm)</label>
                <input 
                  type="range" min="15" max="50" step="1"
                  value={config.stepDepth}
                  onChange={(e) => handleInputChange('stepDepth', parseInt(e.target.value))}
                  className="w-full accent-blue-600 mb-2"
                />
                 <input 
                    type="number" 
                    value={config.stepDepth}
                    onChange={(e) => handleInputChange('stepDepth', parseInt(e.target.value))}
                    className="w-20 p-1 border rounded text-sm text-right font-mono block ml-auto"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Spessore Soletta (cm)</label>
                <input 
                  type="range" min="10" max="50" step="1"
                  value={config.slabThickness}
                  onChange={(e) => handleInputChange('slabThickness', parseInt(e.target.value))}
                  className="w-full accent-blue-600 mb-2"
                />
                 <input 
                    type="number" 
                    value={config.slabThickness}
                    onChange={(e) => handleInputChange('slabThickness', parseInt(e.target.value))}
                    className="w-20 p-1 border rounded text-sm text-right font-mono block ml-auto"
                />
              </div>
            </div>
          </section>

          {/* Landing Section */}
          <section className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
              <ArrowDownToLine className="w-4 h-4" />
              <h2>Pianerottolo</h2>
            </div>
            
            <div>
               <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Inserisci al gradino n.</label>
               <div className="flex items-center gap-3">
                 <input 
                    type="range" min="0" max={config.numSteps} step="1"
                    value={config.landingStep}
                    onChange={(e) => handleInputChange('landingStep', parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                 <input 
                    type="number" 
                    value={config.landingStep}
                    onChange={(e) => handleInputChange('landingStep', parseInt(e.target.value))}
                    className="w-16 p-1 border rounded text-sm text-center font-mono"
                  />
               </div>
               <p className="text-[10px] text-slate-400 mt-1">0 = Nessun pianerottolo</p>
            </div>

            {config.landingStep > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Profondità Pianerottolo (cm)</label>
                 <input 
                  type="range" min="60" max="200" step="5"
                  value={config.landingDepth}
                  onChange={(e) => handleInputChange('landingDepth', parseInt(e.target.value))}
                  className="w-full accent-blue-600 mb-2"
                />
                 <input 
                    type="number" 
                    value={config.landingDepth}
                    onChange={(e) => handleInputChange('landingDepth', parseInt(e.target.value))}
                    className="w-20 p-1 border rounded text-sm text-right font-mono block ml-auto"
                />
              </div>
            )}
          </section>

          {/* Stats Info */}
          <section className="bg-slate-100 p-4 rounded-lg space-y-2 text-sm border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Altezza Alzata:</span>
              <span className={`font-mono font-medium ${parseFloat(stepHeight) > 22 || parseFloat(stepHeight) < 15 ? 'text-red-500' : 'text-slate-700'}`}>{stepHeight} cm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ingombro Totale:</span>
              <span className="font-mono font-medium text-slate-700">{calculatedRun.toFixed(0)} cm</span>
            </div>
            {config.landingStep === 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Pendenza:</span>
                <span className="font-mono font-medium text-slate-700">{slope}°</span>
              </div>
            )}
          </section>

          {/* Actions */}
          <section>
             <button 
              onClick={handleExport}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-md"
            >
              <Download className="w-4 h-4" />
              Esporta Disegno
            </button>
          </section>

        </div>
      </div>

      {/* RIGHT PANEL: VISUALIZATION */}
      {/* Mobile: Order 1 (Top), Height 45% */}
      {/* Desktop: Order 2 (Right), Height 100%, Flex-1 */}
      <div className="flex-1 bg-slate-200 relative flex flex-col order-1 md:order-2 h-[45%] md:h-full">
        <div className="w-full h-full">
           <Staircase3D config={config} showDimensions={showDimensions} />
        </div>
      </div>
    </div>
  );
}