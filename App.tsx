import React, { useState } from 'react';
import { Layers, Ruler } from 'lucide-react';
import Staircase3D from './components/Staircase3D';
import { StairConfig } from './types';

const DEFAULT_CONFIG: StairConfig = {
  totalHeight: 280, // Standard floor height in cm
  width: 90,       // Standard stair width in cm
  numSteps: 14,    // ~20cm riser
  stepDepth: 25,   // ~25cm tread
  slabThickness: 20, // Default concrete thickness
};

export default function App() {
  const [config, setConfig] = useState<StairConfig>(DEFAULT_CONFIG);

  const handleInputChange = (key: keyof StairConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const stepHeight = (config.totalHeight / config.numSteps).toFixed(1);
  const totalRun = ((config.numSteps - 1) * config.stepDepth).toFixed(0);
  const slope = (Math.atan(config.totalHeight / ((config.numSteps * config.stepDepth))) * (180 / Math.PI)).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* LEFT PANEL: CONTROLS */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto z-10 shadow-lg">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            StairGen
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configuratore Scale 3D</p>
        </div>

        <div className="flex-1 p-6 space-y-8">
          
          {/* Dimensions Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2">
              <Ruler className="w-4 h-4" />
              <h2>Dimensioni</h2>
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

          {/* Stats Info */}
          <section className="bg-slate-100 p-4 rounded-lg space-y-2 text-sm border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Altezza Alzata:</span>
              <span className={`font-mono font-medium ${parseFloat(stepHeight) > 22 || parseFloat(stepHeight) < 15 ? 'text-red-500' : 'text-slate-700'}`}>{stepHeight} cm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ingombro Totale:</span>
              <span className="font-mono font-medium text-slate-700">{totalRun} cm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pendenza:</span>
              <span className="font-mono font-medium text-slate-700">{slope}°</span>
            </div>
          </section>

        </div>
      </div>

      {/* RIGHT PANEL: VISUALIZATION */}
      <div className="flex-1 bg-slate-200 relative flex flex-col">
        <div className="flex-1 relative">
           <div className="w-full h-full">
              <Staircase3D config={config} />
           </div>
        </div>
      </div>
    </div>
  );
}