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
  const { totalHeight, width, numSteps, stepDepth, slabThickness, landingStep, landingDepth } = config;
  
  // Conversion constants
  const riserH = (totalHeight / 100) / numSteps;
  const treadD = stepDepth / 100;
  const stairW = width / 100;
  const thickness = slabThickness / 100;
  const landingD = landingDepth / 100;

  // Calculate Geometry and Total Run
  const { geometry, totalRun, totalRise } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);

    let currentX = 0;
    let currentY = 0;
    
    // --- 1. Draw Top Profile (Steps) ---
    for (let i = 1; i <= numSteps; i++) {
      currentY += riserH;
      shape.lineTo(currentX, currentY); // Riser
      
      const isLanding = i === landingStep;
      const run = isLanding ? landingD : treadD;
      
      currentX += run;
      shape.lineTo(currentX, currentY); // Tread/Landing
    }

    const calculatedTotalRun = currentX;
    const calculatedTotalRise = currentY;

    // --- 2. Draw Bottom Profile (Soffit) ---
    // Calculate angle of standard flight
    const angle = Math.atan2(riserH, treadD);
    const verticalOffset = thickness / Math.cos(angle);

    if (landingStep > 0 && landingStep <= numSteps) {
        // COMPLEX CASE: Flight -> Landing -> Flight OR Flight -> Landing (End)
        
        // Coordinates of Landing Surface
        // Landing is at step index 'landingStep'.
        const landingStartX = (landingStep - 1) * treadD;
        const landingSurfaceY = landingStep * riserH;
        const landingSoffitY = landingSurfaceY - thickness; // Flat part thickness assumed vertical

        // Slope m for flights
        const m = Math.tan(angle);

        // Equation of Line 1 (Lower Flight Soffit): y = m*x - verticalOffset
        
        // Intersection 1 (Lower Flight Soffit -> Landing Soffit)
        // m*x - verticalOffset = landingSoffitY => x = (landingSoffitY + verticalOffset) / m
        const xIntersect1 = (landingSoffitY + verticalOffset) / m;
        
        if (landingStep === numSteps) {
             // Case: Flight -> Landing (End)
             // The soffit is flat from xIntersect1 to the end.
             // We draw backwards from End.

             // Point A: End of stair, bottom of slab.
             // Since it's a landing, top is flat, so bottom is flat.
             shape.lineTo(calculatedTotalRun, landingSoffitY);

             // Point C: Intersection 1 (Start of Landing Soffit)
             shape.lineTo(xIntersect1, landingSoffitY);

             // Point D: Bottom Start Intersection
             // Intersect Line 1 with y=0
             const xBottomStart = verticalOffset / m;
             shape.lineTo(Math.max(0, xBottomStart), 0);

        } else {
             // Case: Flight -> Landing -> Flight
             const landingEndX = landingStartX + landingD;
             
             // Equation of Line 3 (Upper Flight Soffit)
             // y = m * (x - (landingD - treadD)) - verticalOffset
             
             // Intersection 2 (Landing Soffit -> Upper Flight Soffit)
             const xIntersect2 = xIntersect1 + (landingD - treadD);

             // Draw the soffit path (Backwards from top right)
             
             // Point A: Top Right Soffit (Angled)
             const topSoffitY = m * (calculatedTotalRun - (landingD - treadD)) - verticalOffset;
             shape.lineTo(calculatedTotalRun, Math.max(0, topSoffitY)); 

             // Point B: Intersection 2 (End of Landing Soffit)
             shape.lineTo(xIntersect2, landingSoffitY);

             // Point C: Intersection 1 (Start of Landing Soffit)
             shape.lineTo(xIntersect1, landingSoffitY);

             // Point D: Bottom Start Intersection
             const xBottomStart = verticalOffset / m;
             shape.lineTo(Math.max(0, xBottomStart), 0);
        }

    } else {
        // STANDARD CASE: Straight flight
        // Top-rear soffit point
        // y = mx - c
        const topSoffitY = (Math.tan(angle) * calculatedTotalRun) - verticalOffset;
        shape.lineTo(calculatedTotalRun, Math.max(0, topSoffitY));

        // Bottom-start soffit intersection
        const xIntersection = verticalOffset / Math.tan(angle);
        shape.lineTo(Math.max(0, xIntersection), 0);
    }

    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: stairW,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
    };

    return {
        geometry: new THREE.ExtrudeGeometry(shape, extrudeSettings),
        totalRun: calculatedTotalRun,
        totalRise: calculatedTotalRise
    };
  }, [totalHeight, width, numSteps, stepDepth, slabThickness, landingStep, landingDepth, riserH, treadD, stairW, thickness, landingD]);

  // --- Dimension Logic ---
  const dims = useMemo(() => {
    // 1. Total Height (Side -> Front)
    const heightLine = {
      start: [totalRun + 0.2, 0, stairW] as [number, number, number],
      end: [totalRun + 0.2, totalRise, stairW] as [number, number, number],
      label: `${totalHeight}cm`,
    };

    // 2. Total Run (Bottom -> Front)
    const runLine = {
      start: [0, -0.2, stairW] as [number, number, number],
      end: [totalRun, -0.2, stairW] as [number, number, number],
      label: `${(totalRun * 100).toFixed(0)}cm`,
    };

    // 3. Width (Top/Front)
    const widthLine = {
      start: [treadD / 2, riserH + 0.3, 0] as [number, number, number],
      end: [treadD / 2, riserH + 0.3, stairW] as [number, number, number],
      label: `${width}cm`,
    };

    // Determine which step to measure for standard riser/tread dimensions.
    // If step 1 is a landing, we measure step 2 to show standard step dimensions.
    const measureStepIdx = landingStep === 1 ? 2 : 1;
    // X position where this step starts.
    const measureStartX = landingStep === 1 ? landingD : 0;
    const measureY = measureStepIdx * riserH;

    // 4. Single Step Riser (Zoomed detail)
    const stepRiserLine = {
        start: [measureStartX - 0.15, measureY - riserH, stairW] as [number, number, number],
        end: [measureStartX - 0.15, measureY, stairW] as [number, number, number],
        label: `${(riserH * 100).toFixed(1)}`,
    }

    // 5. Single Step Tread
    const stepTreadLine = {
        start: [measureStartX, measureY + 0.15, stairW] as [number, number, number],
        end: [measureStartX + treadD, measureY + 0.15, stairW] as [number, number, number],
        label: `${stepDepth}`, 
    }
    
    // 6. Slab Thickness 
    // Calculate for first flight (simpler)
    const angle = Math.atan2(riserH, treadD);
    // Find a point in the middle of first flight
    const midStep = landingStep > 1 ? Math.floor(landingStep/2) : Math.floor(numSteps/2);
    const midX = midStep * treadD;
    // Calculate pitch line Y at this X
    const midYPitch = midX * Math.tan(angle);
    const verticalOffset = thickness / Math.cos(angle);
    const midYSoffit = midYPitch - verticalOffset;

    const thicknessLine = {
        start: [midX, midYSoffit, stairW + 0.05] as [number, number, number],
        end: [midX - Math.sin(angle)*thickness, midYSoffit + Math.cos(angle)*thickness, stairW + 0.05] as [number, number, number],
        label: `${slabThickness}`, 
    };

    // 7. Landing Depth
    let landingLine = undefined;
    if (landingStep > 0 && landingStep <= numSteps) {
         const landingStartX = (landingStep - 1) * treadD;
         const landingY = landingStep * riserH;
         landingLine = {
            start: [landingStartX, landingY + 0.15, stairW] as [number, number, number],
            end: [landingStartX + landingD, landingY + 0.15, stairW] as [number, number, number],
            label: `${landingDepth}`,
         }
    }

    return { heightLine, runLine, widthLine, stepRiserLine, stepTreadLine, thicknessLine, landingLine };

  }, [totalHeight, width, numSteps, stepDepth, slabThickness, riserH, treadD, stairW, totalRun, totalRise, thickness, landingStep, landingD, landingDepth]);


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
          <DimensionLine {...dims.stepRiserLine} color="#fbbf24" /> 
          <DimensionLine {...dims.stepTreadLine} color="#fbbf24" />
          <DimensionLine {...dims.thicknessLine} color="#38bdf8" />
          {dims.landingLine && <DimensionLine {...dims.landingLine} color="#fbbf24" />}
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
          args={[20, 20]} 
          cellSize={0.5} 
          cellThickness={0.5} 
          cellColor="#64748b" 
          sectionSize={1}
          sectionColor="#94a3b8"
          fadeDistance={30}
        />
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={20} blur={2.5} far={4} />
        
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} target={[1, 1, 0]} />
      </Canvas>
    </div>
  );
};

export default Staircase3D;