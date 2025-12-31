import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { StairConfig } from '../types';

// --- Dimension Helper Component ---
const DimensionLine: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  label?: string;
  color?: string;
  offset?: [number, number, number];
}> = ({ start, end, label, color = "white", offset = [0, 0, 0] }) => {
  const vStart = new THREE.Vector3(...start).add(new THREE.Vector3(...offset));
  const vEnd = new THREE.Vector3(...end).add(new THREE.Vector3(...offset));
  const center = vStart.clone().add(vEnd).multiplyScalar(0.5);

  // Determine label alignment based on line orientation
  const isVertical = Math.abs(vStart.y - vEnd.y) > Math.abs(vStart.x - vEnd.x);

  return (
    <group>
      {/* Main Line */}
      <Line points={[vStart, vEnd]} color={color} lineWidth={1} opacity={0.6} transparent />
      
      {/* End Ticks */}
      <Tick point={vStart} dir={vEnd.clone().sub(vStart)} size={0.05} color={color} />
      <Tick point={vEnd} dir={vStart.clone().sub(vEnd)} size={0.05} color={color} />

      {/* Label */}
      {label && (
        <Text
          position={[center.x, center.y, center.z]}
          fontSize={0.12}
          color={color}
          anchorX="center"
          anchorY={isVertical ? "middle" : "bottom"}
          outlineWidth={0.02}
          outlineColor="#1e293b"
          rotation={[0, 0, 0]} // Fixed rotation for readability
        >
          {label}
        </Text>
      )}
    </group>
  );
};

// Helper for the little perpendicular ticks at the end of dimension lines
const Tick: React.FC<{ point: THREE.Vector3; dir: THREE.Vector3; size: number; color: string }> = ({ point, dir, size, color }) => {
   const direction = dir.normalize();
   let tickDir = new THREE.Vector3(0, 1, 0);
   // If line is vertical, tick is horizontal (X). If line is horizontal (X or Z), tick is Y.
   if (Math.abs(direction.y) > 0.9) tickDir = new THREE.Vector3(1, 0, 0); 
   
   const p1 = point.clone().add(tickDir.clone().multiplyScalar(size / 2));
   const p2 = point.clone().add(tickDir.clone().multiplyScalar(-size / 2));

   return <Line points={[p1, p2]} color={color} lineWidth={1} />;
}

const StairModel: React.FC<{ config: StairConfig; showDimensions: boolean }> = ({ config, showDimensions }) => {
  const { totalHeight, width, numSteps, stepDepth, slabThickness } = config;
  
  // Conversion constants
  const riserH = (totalHeight / 100) / numSteps;
  const treadD = stepDepth / 100;
  const stairW = width / 100;
  const thickness = slabThickness / 100;
  const totalRun = numSteps * treadD;
  const totalRise = numSteps * riserH;

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Start at bottom-left origin
    shape.moveTo(0, 0);

    // 1. Draw Steps
    for (let i = 0; i < numSteps; i++) {
      shape.lineTo(i * treadD, (i + 1) * riserH);
      shape.lineTo((i + 1) * treadD, (i + 1) * riserH);
    }

    // 2. Slab Bottom Calculation
    const angle = Math.atan2(totalRise, totalRun);
    const verticalOffset = thickness / Math.cos(angle);
    
    // Top-rear soffit point
    shape.lineTo(totalRun, Math.max(0, totalRise - verticalOffset));

    // Bottom-start soffit intersection
    const xIntersection = verticalOffset / Math.tan(angle);
    shape.lineTo(Math.max(0, xIntersection), 0);

    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: stairW,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [totalHeight, width, numSteps, stepDepth, slabThickness, riserH, treadD, stairW, thickness, totalRun, totalRise]);

  // --- Dimension Logic ---
  const dims = useMemo(() => {
    // 1. Total Height (Side)
    const heightLine = {
      start: [totalRun + 0.2, 0, stairW / 2] as [number, number, number],
      end: [totalRun + 0.2, totalRise, stairW / 2] as [number, number, number],
      label: `${totalHeight}cm`,
    };

    // 2. Total Run (Bottom)
    const runLine = {
      start: [0, -0.2, stairW / 2] as [number, number, number],
      end: [totalRun, -0.2, stairW / 2] as [number, number, number],
      label: `${(totalRun * 100).toFixed(0)}cm`,
    };

    // 3. Width (Top/Front)
    // Place this slightly above the first step
    const widthLine = {
      start: [treadD / 2, riserH + 0.3, 0] as [number, number, number],
      end: [treadD / 2, riserH + 0.3, stairW] as [number, number, number],
      label: `${width}cm`,
    };

    // 4. Single Step Riser (Zoomed detail on first step - FRONT SIDE)
    // Positioned to the left of the first step start (x=0)
    const stepRiserLine = {
        start: [-0.15, 0, stairW] as [number, number, number],
        end: [-0.15, riserH, stairW] as [number, number, number],
        label: `${(riserH * 100).toFixed(1)}`, // Just number
    }

    // 5. Single Step Tread (FRONT SIDE)
    // Positioned above the first tread
    const stepTreadLine = {
        start: [0, riserH + 0.15, stairW] as [number, number, number],
        end: [treadD, riserH + 0.15, stairW] as [number, number, number],
        label: `${stepDepth}`, // Just number
    }
    
    // 6. Slab Thickness (Visual indicator at approx middle)
    const angle = Math.atan2(totalRise, totalRun);
    const midX = totalRun / 2;
    // Calculate soffit Y at midX
    const verticalOffset = thickness / Math.cos(angle);
    const midYPitch = midX * Math.tan(angle);
    const midYSoffit = midYPitch - verticalOffset;
    
    // Calculate perpendicular point for thickness visualization
    // Normal vector direction from soffit towards pitch line
    const thicknessLine = {
        start: [midX, midYSoffit, stairW + 0.05] as [number, number, number],
        end: [midX - Math.sin(angle)*thickness, midYSoffit + Math.cos(angle)*thickness, stairW + 0.05] as [number, number, number],
        label: `${slabThickness}`, // Just number
    };

    return { heightLine, runLine, widthLine, stepRiserLine, stepTreadLine, thicknessLine };

  }, [totalHeight, width, numSteps, stepDepth, slabThickness, riserH, treadD, stairW, totalRun, totalRise, thickness]);


  return (
    <group position={[0, 0, -(stairW / 2)]}> 
      <mesh 
        geometry={geometry} 
        receiveShadow 
        castShadow
        rotation={[0, 0, 0]}
      >
        <meshStandardMaterial 
          color="#94a3b8" 
          roughness={0.9} 
          metalness={0.2} 
        />
         <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#475569" opacity={0.3} transparent />
        </lineSegments>
      </mesh>

      {/* Dimensions Overlay */}
      {showDimensions && (
        <group>
          <DimensionLine {...dims.heightLine} />
          <DimensionLine {...dims.runLine} />
          <DimensionLine {...dims.widthLine} />
          {/* Detail Dimensions */}
          <DimensionLine {...dims.stepRiserLine} color="#fbbf24" /> 
          <DimensionLine {...dims.stepTreadLine} color="#fbbf24" />
          <DimensionLine {...dims.thicknessLine} color="#38bdf8" />
        </group>
      )}
    </group>
  );
};

interface Staircase3DProps {
  config: StairConfig;
  showDimensions: boolean;
}

const Staircase3D: React.FC<Staircase3DProps> = ({ config, showDimensions }) => {
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden shadow-inner relative">
       <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [4, 4, 4], fov: 45 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
          shadow-bias={-0.0001}
        />
        <Environment preset="city" />
        
        <StairModel config={config} showDimensions={showDimensions} />
        
        {/* Floor Grid */}
        <Grid 
          position={[0, -0.01, 0]} 
          args={[10, 10]} 
          cellSize={0.5} 
          cellThickness={0.5} 
          cellColor="#64748b" 
          sectionSize={1}
          sectionColor="#94a3b8"
          fadeDistance={20}
        />
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
        
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} target={[1, 1, 0]} />
      </Canvas>
    </div>
  );
};

export default Staircase3D;