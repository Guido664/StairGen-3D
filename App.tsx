import React, { useState } from 'react';
import { Layers, Ruler, Download, ArrowDownToLine, Plus, Trash2 } from 'lucide-react';
import Staircase3D from './components/Staircase3D';
import { StairConfig, Landing } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_CONFIG: StairConfig = {
  totalHeight: 270,
  width: 90,
  numSteps: 14,
  stepDepth: 30,
  slabThickness: 20,
  landings: [], // Start empty or add one default if preferred
};

export default function App() {
  const [config, setConfig] = useState<StairConfig>(DEFAULT_CONFIG);
  const [showDimensions, setShowDimensions] = useState(false);

  const handleInputChange = (key: keyof StairConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // --- Landing Management ---
  const addLanding = () => {
    setConfig((prev) => {
      // Find a free step index (default to middle or next available)
      const usedSteps = new Set(prev.landings.map(l => l.stepIndex));
      let nextStep = Math.floor(prev.numSteps / 2);
      if (usedSteps.has(nextStep)) {
        nextStep = prev.numSteps; // Try last
        while (usedSteps.has(nextStep) && nextStep > 1) nextStep--; // Find backwards
      }
      
      const newLanding: Landing = {
        id: generateId(),
        stepIndex: nextStep,
        depth: 90
      };
      
      // Sort landings by step index immediately
      const newLandings = [...prev.landings, newLanding].sort((a, b) => a.stepIndex - b.stepIndex);
      return { ...prev, landings: newLandings };
    });
  };

  const updateLanding = (id: string, field: keyof Landing, value: number) => {
    setConfig((prev) => {
      const newLandings = prev.landings.map((l) => {
        if (l.id === id) {
           // Prevent out of bounds
           if (field === 'stepIndex') {
             if (value < 1) value = 1;
             if (value > prev.numSteps) value = prev.numSteps;
           }
           return { ...l, [field]: value };
        }
        return l;
      });
      // Re-sort if step index changed
      if (field === 'stepIndex') {
        newLandings.sort((a, b) => a.stepIndex - b.stepIndex);
      }
      return { ...prev, landings: newLandings };
    });
  };

  const removeLanding = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      landings: prev.landings.filter((l) => l.id !== id)
    }));
  };


  const stepHeight = (config.totalHeight / config.numSteps).toFixed(1);
  
  // Calculate total run dynamically based on landings
  let calculatedRun = 0;
  // Create a map for quick lookup
  const landingMap = new Map<number, number>(config.landings.map(l => [l.stepIndex, l.depth] as [number, number]));
  
  for (let i = 1; i <= config.numSteps; i++) {
      if (landingMap.has(i)) {
          calculatedRun += landingMap.get(i)!;
      } else {
          // If it's the very last step and it's NOT a landing, usually in architectural plans 
          // the run of the last step (arrival) isn't counted in the "run" (pedata), 
          // but for the 3D block model we need to draw it. 
          calculatedRun += config.stepDepth;
      }
  }

  const slope = (Math.atan(config.totalHeight / calculatedRun) * (180 / Math.PI)).toFixed(1);

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'scala-3d.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* LEFT PANEL: CONTROLS */}
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
                <h2>Dimensioni Generali</h2>
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
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Profondità Pedata Standard (cm)</label>
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <ArrowDownToLine className="w-4 h-4" />
                <h2>Pianerottoli</h2>
                </div>
                <button 
                    onClick={addLanding}
                    disabled={config.landings.length >= config.numSteps}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                >
                    <Plus className="w-3 h-3" /> Aggiungi
                </button>
            </div>
            
            {config.landings.length === 0 ? (
                 <p className="text-xs text-slate-400 italic">Nessun pianerottolo inserito.</p>
            ) : (
                <div className="space-y-3">
                    {config.landings.map((landing, index) => (
                        <div key={landing.id} className="bg-slate-50 p-3 rounded border border-slate-200 relative group">
                            <button 
                                onClick={() => removeLanding(landing.id)}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                                title="Rimuovi"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            
                            <div className="grid grid-cols-2 gap-3 pr-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                        Gradino N.
                                    </label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={config.numSteps}
                                        value={landing.stepIndex}
                                        onChange={(e) => updateLanding(landing.id, 'stepIndex', parseInt(e.target.value))}
                                        className="w-full p-1 border rounded text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                        Profondità (cm)
                                    </label>
                                    <input 
                                        type="number" 
                                        min="60"
                                        max="300" 
                                        step="5"
                                        value={landing.depth}
                                        onChange={(e) => updateLanding(landing.id, 'depth', parseInt(e.target.value))}
                                        className="w-full p-1 border rounded text-sm font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
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
      <div className="flex-1 bg-slate-200 relative flex flex-col order-1 md:order-2 h-[45%] md:h-full">
        <div className="w-full h-full">
           <Staircase3D config={config} showDimensions={showDimensions} />
        </div>
      </div>
    </div>
  );
}