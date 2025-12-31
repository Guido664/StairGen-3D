import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { StairConfig } from '../types';

const StairModel: React.FC<{ config: StairConfig }> = ({ config }) => {
  const { totalHeight, width, numSteps, stepDepth, slabThickness } = config;
  
  const geometry = useMemo(() => {
    // Units in meters
    const riserH = (totalHeight / 100) / numSteps;
    const treadD = stepDepth / 100;
    const stairW = width / 100;
    const thickness = slabThickness / 100;

    const shape = new THREE.Shape();
    
    // Start at bottom-left origin (relative to the first riser base)
    shape.moveTo(0, 0);

    // 1. Draw the zig-zag steps (Top Surface)
    // We iterate to draw each riser and tread
    for (let i = 0; i < numSteps; i++) {
      // Up (Riser)
      shape.lineTo(i * treadD, (i + 1) * riserH);
      // Right (Tread)
      shape.lineTo((i + 1) * treadD, (i + 1) * riserH);
    }

    // Current point is at the top-rear of the last step: (numSteps * treadD, totalHeight)
    const totalRun = numSteps * treadD;
    const totalRise = numSteps * riserH;

    // 2. Calculate the bottom points for the slab
    // We want the bottom to be a straight line (flat soffit) with a specific thickness (waist)
    // measured from the internal corner (throat) of the steps.
    
    // Angle of the stairs
    const angle = Math.atan2(totalRise, totalRun);
    
    // The vertical distance to drop to maintain perpendicular thickness
    const verticalOffset = thickness / Math.cos(angle);

    // Point at top-end of soffit
    // We drop down from the top-back corner by the vertical offset
    // Ensure we don't go below floor if the slab is super thick (unlikely for normal stairs)
    shape.lineTo(totalRun, Math.max(0, totalRise - verticalOffset));

    // Point at bottom-start of soffit (Intersection with Floor y=0)
    // Previously we went to (0, -verticalOffset), which is underground.
    // Now we calculate where the soffit line hits y=0.
    // The soffit line equation relative to origin (0,0) passing through internal corners is:
    // y = x * tan(angle) - verticalOffset (approximately, assuming parallel to pitch line through origin)
    // Solving for y=0: x = verticalOffset / tan(angle)
    
    const xIntersection = verticalOffset / Math.tan(angle);
    
    // We clamp to 0 just in case, though it should be positive.
    shape.lineTo(Math.max(0, xIntersection), 0);

    // Close shape back to (0,0) to create the flat base on the floor
    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: stairW, // This extrudes along Z
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [totalHeight, width, numSteps, stepDepth, slabThickness]);

  return (
    <group position={[0, 0, -(width / 200)]}> 
      <mesh 
        geometry={geometry} 
        receiveShadow 
        castShadow
        rotation={[0, 0, 0]}
      >
        <meshStandardMaterial 
          color="#94a3b8" // Concrete Grey
          roughness={0.9} 
          metalness={0.2} 
        />
        {/* Wireframe overlay for structural clarity */}
         <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#475569" opacity={0.3} transparent />
        </lineSegments>
      </mesh>
    </group>
  );
};

interface Staircase3DProps {
  config: StairConfig;
}

const Staircase3D: React.FC<Staircase3DProps> = ({ config }) => {
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
        
        <StairModel config={config} />
        
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
      <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none">
        Vista 3D Cemento
      </div>
    </div>
  );
};

export default Staircase3D;