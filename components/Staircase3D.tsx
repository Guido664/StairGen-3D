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

  const isVertical = Math.abs(vStart.y - vEnd.y) > Math.abs(vStart.x - vEnd.x);

  return (
    <group>
      <Line points={[vStart, vEnd]} color={color} lineWidth={1} opacity={0.6} transparent />
      <Tick point={vStart} dir={vEnd.clone().sub(vStart)} size={0.05} color={color} />
      <Tick point={vEnd} dir={vStart.clone().sub(vEnd)} size={0.05} color={color} />
      {label && (
        <Text
          position={[center.x, center.y, center.z]}
          fontSize={0.12}
          color={color}
          anchorX="center"
          anchorY={isVertical ? "middle" : "bottom"}
          outlineWidth={0.02}
          outlineColor="#1e293b"
          rotation={[0, 0, 0]}
        >
          {label}
        </Text>
      )}
    </group>
  );
};

const Tick: React.FC<{ point: THREE.Vector3; dir: THREE.Vector3; size: number; color: string }> = ({ point, dir, size, color }) => {
   const direction = dir.normalize();
   let tickDir = new THREE.Vector3(0, 1, 0);
   if (Math.abs(direction.y) > 0.9) tickDir = new THREE.Vector3(1, 0, 0); 
   const p1 = point.clone().add(tickDir.clone().multiplyScalar(size / 2));
   const p2 = point.clone().add(tickDir.clone().multiplyScalar(-size / 2));
   return <Line points={[p1, p2]} color={color} lineWidth={1} />;
}

const StairModel: React.FC<{ config: StairConfig; showDimensions: boolean }> = ({ config, showDimensions }) => {
  const { totalHeight, width, numSteps, stepDepth, slabThickness, landings } = config;
  
  // Conversion constants
  const riserH = (totalHeight / 100) / numSteps;
  const treadD = stepDepth / 100;
  const stairW = width / 100;
  const thickness = slabThickness / 100;

  // Map for quick landing lookup: stepIndex -> depth (meters)
  const landingMap = useMemo(() => {
    const map = new Map<number, number>();
    landings.forEach(l => map.set(l.stepIndex, l.depth / 100));
    return map;
  }, [landings]);

  // Calculate Geometry
  const { geometry, totalRun, totalRise, dimensionPoints } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);

    let currentX = 0;
    let currentY = 0;
    
    // Store step coordinates for dimension calculation
    // Array of { stepIdx: number, x: number, y: number, isLanding: boolean, depth: number }
    const stepCoords: {stepIdx: number, startX: number, startY: number, depth: number, isLanding: boolean}[] = [];

    // --- 1. Draw Top Profile (Steps) ---
    for (let i = 1; i <= numSteps; i++) {
      currentY += riserH;
      shape.lineTo(currentX, currentY); // Riser
      
      const isLanding = landingMap.has(i);
      const run = isLanding ? landingMap.get(i)! : treadD;
      
      stepCoords.push({ 
          stepIdx: i, 
          startX: currentX, 
          startY: currentY, // Top of step
          depth: run,
          isLanding 
      });

      currentX += run;
      shape.lineTo(currentX, currentY); // Tread/Landing
    }

    const calculatedTotalRun = currentX;
    const calculatedTotalRise = currentY;

    // --- 2. Draw Bottom Profile (Soffit) ---
    // We iterate backwards from top to bottom.
    // We break the staircase into "Segments". A segment is either a Flight (series of regular steps) or a Landing.
    
    // Angle of a standard flight
    const angle = Math.atan2(riserH, treadD);
    const m = Math.tan(angle); // Slope
    const verticalOffset = thickness / Math.cos(angle);

    // Identify Segments
    // Types: 'flight' | 'landing'
    interface Segment { type: 'flight' | 'landing'; startStep: number; endStep: number; startX: number; startY: number; endX: number; endY: number; }
    
    const segments: Segment[] = [];
    let currentSegType: 'flight' | 'landing' | null = null;
    let segStartStep = 1;
    let segStartX = 0;
    let segStartY = 0; // Bottom-left corner of the first step in segment relative to global 0,0

    // To reconstruct coordinates, we use stepCoords
    // stepCoords[i] is step i+1. stepCoords[0] is step 1.
    // stepCoords[i].startX is the X at the beginning of the tread (top of riser)
    
    for (let i = 0; i < stepCoords.length; i++) {
        const step = stepCoords[i];
        const type = step.isLanding ? 'landing' : 'flight';
        
        // Step Start (Nosing of previous step, or 0,0 for first)
        const stepStartX = step.startX; 
        const stepStartY = step.startY; // This is top surface Y. 

        if (currentSegType === null) {
            currentSegType = type;
            segStartStep = step.stepIdx;
            segStartX = stepStartX;
            segStartY = stepStartY;
        } else if (currentSegType !== type) {
            // Push previous segment
            // End of previous segment is the Start of this step
            segments.push({
                type: currentSegType,
                startStep: segStartStep,
                endStep: step.stepIdx - 1,
                startX: segStartX, // X where segment started (tread start)
                startY: segStartY, // Y where segment started (tread level)
                endX: stepStartX, // X where segment ended (end of last tread)
                endY: stepStartY  // Y where segment ended
            });
            // Start new segment
            currentSegType = type;
            segStartStep = step.stepIdx;
            segStartX = stepStartX;
            segStartY = stepStartY;
        }
    }
    // Push last segment
    segments.push({
        type: currentSegType!,
        startStep: segStartStep,
        endStep: numSteps,
        startX: segStartX,
        startY: segStartY,
        endX: calculatedTotalRun,
        endY: calculatedTotalRise
    });

    // Helper to get Y on soffit for a given X in a segment
    const getSoffitY = (x: number, seg: Segment) => {
        if (seg.type === 'landing') {
            // Flat soffit: Top Surface Y of landing - Thickness
            // Note: seg.startY is the Y level of the steps surface (because stepCoords stores top Y)
            return seg.startY - thickness; 
        } else {
            // Flight soffit: y = m * (x - segStartX) + segStartY - riserH - verticalOffset ?
            // Let's visualize: 
            // A flight starts at (segStartX, segStartY). segStartY is the top of the first riser in flight.
            // The "Nosing Line" passes through (segStartX + treadD, segStartY).
            // Actually, (segStartX, segStartY) IS the nosing of the *previous* step.
            // For the first step of flight, the nosing is at (segStartX + treadD, segStartY).
            // The line equation passing through nosings: Y = m * (x - (segStartX + treadD)) + segStartY
            // Soffit is parallel and below by verticalOffset.
            // Soffit Y = m * (x - segStartX - treadD) + segStartY - verticalOffset.
            // Check first step origin (0,0):
            // If segStartX=0, segStartY=riserH (step 1 top).
            // Y = m * (0 - 0.25) + 0.2 - off.
            
            // Simpler: The line passes through (segStartX, segStartY - riserH). This is bottom of riser 1.
            // No, geometric approach is safer.
            // The nosing line of this flight segment passes through:
            // Point 1: (segStartX, segStartY - riserH) -> Virtual point "before" first riser? No.
            // Point 2: (segStartX + treadD, segStartY) -> Nosing of first step in segment.
            
            // Equation of nosing line: y - segStartY = m * (x - (segStartX + treadD))
            // Soffit Line: y = m * (x - segStartX - treadD) + segStartY - verticalOffset
            return m * (x - segStartX - treadD) + segStartY - verticalOffset;
        }
    };

    // Draw Soffit Backwards
    // We have segments S_0 ... S_n.
    // Reverse iterate segments.
    
    // Handle the very end of the stair first.
    const lastSeg = segments[segments.length - 1];
    
    // Top-Right Soffit Point
    const lastSoffitY = getSoffitY(lastSeg.endX, lastSeg);
    shape.lineTo(lastSeg.endX, Math.max(0, lastSoffitY));

    // Iterate backwards through intersections
    for (let i = segments.length - 1; i > 0; i--) {
        const segCurr = segments[i];
        const segPrev = segments[i-1];

        // Find intersection X between segPrev and segCurr
        // Eq1: y = m1*x + c1 (or flat)
        // Eq2: y = m2*x + c2 (or flat)
        // Since we alternate types, one is flat, one is sloped.
        
        let intersectX, intersectY;

        if (segCurr.type === 'landing') {
            // Curr is Flat (y = C), Prev is Sloped.
            // Flat Y:
            const flatY = segCurr.startY - thickness; // Landing surface level - thickness
            // Sloped Line from Prev:
            // y = m * (x - segPrev.startX - treadD) + segPrev.startY - verticalOffset
            // Solve for x:
            // flatY = m*x - m*(prevStart + tread) + prevStartY - vOff
            // m*x = flatY + m*(prevStart + tread) - prevStartY + vOff
            // x = (flatY - prevStartY + verticalOffset)/m + prevStart + tread
            intersectY = flatY;
            intersectX = (flatY - segPrev.startY + verticalOffset) / m + segPrev.startX + treadD;

        } else {
            // Curr is Sloped, Prev is Flat.
            // Flat Y from Prev:
            const flatY = segPrev.startY - thickness;
            // Sloped Line from Curr:
            // y = m * (x - segCurr.startX - treadD) + segCurr.startY - verticalOffset
            // Set y = flatY, solve for x.
            intersectY = flatY;
            intersectX = (flatY - segCurr.startY + verticalOffset) / m + segCurr.startX + treadD;
        }

        shape.lineTo(intersectX, intersectY);
    }

    // Handle the very start (connection to floor 0,0)
    const firstSeg = segments[0];
    if (firstSeg.type === 'landing') {
        // Flat bottom hitting start
        shape.lineTo(0, firstSeg.startY - thickness);
        shape.lineTo(0, 0); // Should be thickness? No, usually goes to floor.
        // If start is landing (step 1), Y surface is riserH. Soffit is riserH - thickness.
        // If riserH < thickness, this point is below 0. 
        // We clamp to 0 usually for floor visualization.
        shape.lineTo(0, Math.min(0, firstSeg.startY - thickness)); // Close loop
    } else {
        // Sloped bottom hitting y=0
        // y = m * (x - startX - treadD) + startY - verticalOffset = 0
        // with startX=0, startY=riserH.
        // 0 = m*(x - tread) + riser - vOff
        // m*(x-tread) = vOff - riser
        // x - tread = (vOff - riser)/m
        // x = (vOff - riser)/m + tread
        const startIntersectX = (verticalOffset - riserH) / m + treadD;
        shape.lineTo(Math.max(0, startIntersectX), 0);
    }
    
    shape.lineTo(0, 0); // Close

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
        totalRise: calculatedTotalRise,
        dimensionPoints: stepCoords
    };
  }, [totalHeight, width, numSteps, stepDepth, slabThickness, landings, riserH, treadD, stairW, thickness, landingMap]);

  // --- Dimension Logic ---
  const dims = useMemo(() => {
    // 1. Height
    const heightLine = {
      start: [totalRun + 0.2, 0, stairW] as [number, number, number],
      end: [totalRun + 0.2, totalRise, stairW] as [number, number, number],
      label: `${totalHeight}cm`,
    };

    // 2. Run
    const runLine = {
      start: [0, -0.2, stairW] as [number, number, number],
      end: [totalRun, -0.2, stairW] as [number, number, number],
      label: `${(totalRun * 100).toFixed(0)}cm`,
    };

    // 3. Width
    const widthLine = {
      start: [treadD / 2, riserH + 0.3, 0] as [number, number, number],
      end: [treadD / 2, riserH + 0.3, stairW] as [number, number, number],
      label: `${width}cm`,
    };

    // 4. Sample Step (Find a standard step if possible)
    let sampleStepIdx = 1;
    // Try to find a non-landing step
    const nonLanding = dimensionPoints.find(p => !p.isLanding && p.stepIdx > 1); // Prefer > 1 to avoid floor clamp
    if (nonLanding) sampleStepIdx = nonLanding.stepIdx;
    
    const sampleStep = dimensionPoints[sampleStepIdx - 1]; // 0-based
    const sampleX = sampleStep.startX;
    const sampleY = sampleStep.startY;

    const stepRiserLine = {
        start: [sampleX - 0.15, sampleY - riserH, stairW] as [number, number, number],
        end: [sampleX - 0.15, sampleY, stairW] as [number, number, number],
        label: `${(riserH * 100).toFixed(1)}`,
    }

    const stepTreadLine = {
        start: [sampleX, sampleY + 0.15, stairW] as [number, number, number],
        end: [sampleX + treadD, sampleY + 0.15, stairW] as [number, number, number],
        label: `${stepDepth}`, 
    }
    
    // 5. Landings
    const landingLines = landings.map((l, i) => {
        const pt = dimensionPoints[l.stepIndex - 1];
        if(!pt) return null;
        return {
            start: [pt.startX, pt.startY + 0.15 + (i*0.1), stairW] as [number, number, number],
            end: [pt.startX + (l.depth/100), pt.startY + 0.15 + (i*0.1), stairW] as [number, number, number],
            label: `${l.depth}`,
        }
    }).filter(x => x !== null);

    // 6. Thickness (Approximate location on first flight)
    // Find middle of first flight
    let thicknessLine = null;
    const firstFlightSteps = dimensionPoints.filter(p => !p.isLanding);
    if(firstFlightSteps.length > 0) {
        const midIdx = Math.floor(firstFlightSteps.length / 2);
        const midStep = firstFlightSteps[midIdx];
        const angle = Math.atan2(riserH, treadD);
        const midYPitch = midStep.startY - riserH + (treadD/2)*Math.tan(angle); // Approx pitch line
        const midYSoffit = midYPitch - thickness/Math.cos(angle);
        const mX = midStep.startX + treadD/2;

        thicknessLine = {
            start: [mX, midYSoffit, stairW + 0.05] as [number, number, number],
            end: [mX - Math.sin(angle)*thickness, midYSoffit + Math.cos(angle)*thickness, stairW + 0.05] as [number, number, number],
            label: `${slabThickness}`, 
        };
    }

    return { heightLine, runLine, widthLine, stepRiserLine, stepTreadLine, thicknessLine, landingLines };

  }, [totalHeight, width, numSteps, stepDepth, slabThickness, riserH, treadD, stairW, totalRun, totalRise, thickness, landings, dimensionPoints]);


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
          {dims.thicknessLine && <DimensionLine {...dims.thicknessLine} color="#38bdf8" />}
          
          {dims.landingLines.map((line, i) => (
             line && <DimensionLine key={i} {...line} color="#fbbf24" />
          ))}
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