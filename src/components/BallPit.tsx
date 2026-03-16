import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

// The 10 avatars we have in public/avatars
const AVATARS = [
  '/avatars/person1-1.PNG',
  '/avatars/person1-2.PNG',
  '/avatars/person1-3.PNG',
  '/avatars/person1-4.PNG',
  '/avatars/person1-5.PNG',
  '/avatars/person2-1.PNG',
  '/avatars/person2-2.PNG',
  '/avatars/person2-3.PNG',
  '/avatars/person2-4.PNG',
  '/avatars/person2-5.PNG',
];

interface BallPitProps {
  onAnimationEnd: () => void;
  duration?: number;
  windForce?: number; // Configurable wind force multiplier
}

export default function BallPit({ onAnimationEnd, duration = 3000, windForce = 10 }: BallPitProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // Maintain state for the DOM overlays
  const [ballData, setBallData] = useState<{ id: number; x: number; y: number; angle: number; src: string }[]>([]);

  useEffect(() => {
    if (!sceneRef.current) return;

    // 1. Setup Matter.js Engine & World
    const engine = Matter.Engine.create();
    const world = engine.world;
    engineRef.current = engine;

    // Container dimensions
    const width = 350;
    const height = 350;

    // 2. Setup Renderer
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        wireframes: false,
        background: 'transparent', // Make canvas transparent
        pixelRatio: window.devicePixelRatio, // Sharper on retina
      }
    });
    renderRef.current = render;

    // 3. Create Boundaries (Circular Hollow Ring)
    const wallOptions = {
        isStatic: true,
        render: { fillStyle: 'transparent' } // Invisible walls
    };

    // To make a hollow circle boundary in matter.js, we need to compose it from multiple small rectangles
    const parts: Matter.Body[] = [];
    const roofParts: Matter.Body[] = [];
    const segments = 36;
    const ringRadius = width / 2;
    const thickness = 60; // Thicker walls to prevent balls clipping through at high speed
    
    for (let i = 0; i < segments; i++) {
        const theta = (Math.PI * 2 * i) / segments; // 0 to 2PI
        const x = width / 2 + Math.cos(theta) * (ringRadius + thickness / 2);
        const y = height / 2 + Math.sin(theta) * (ringRadius + thickness / 2);
          
        const rect = Matter.Bodies.rectangle(x, y, thickness, (Math.PI * 2 * ringRadius) / segments + 5, {
            ...wallOptions,
            angle: theta,
        });

        // 0 to PI (Right -> Bottom -> Left) for the cup
        if (i <= 18) {
            parts.push(rect);
        } else {
            // The top lid
            roofParts.push(rect);
        }
    }
    const boundary = Matter.Body.create({ parts, isStatic: true });
    const roofBoundary = Matter.Body.create({ parts: roofParts, isStatic: true });

    Matter.World.add(world, [boundary]);

    // 4. Create Balls with Avatars
    const balls: Matter.Body[] = [];
    const radius = 30; // Radius of each ball

    AVATARS.forEach((avatarSrc, index) => {
      // Start slightly scaled down from the top center
      const startX = width / 2 + (Math.random() - 0.5) * 50;
      const startY = -150 - (index * 40); // Drop from higher up

      const ball = Matter.Bodies.circle(startX, startY, radius, {
        restitution: 0.8, // Bounciness
        friction: 0.005,
        density: 0.04,
        render: {
          visible: false // We will render them via React DOM instead for perfect circles
        }
      });
      // Store avatar src in body for reference
      (ball as any).avatarSrc = avatarSrc;
      
      // Add random initial force
      Matter.Body.applyForce(ball, ball.position, {
        x: (Math.random() - 0.5) * 0.05,
        y: Math.random() * 0.05
      });

      balls.push(ball);
    });

    Matter.World.add(world, balls);

    // 5. Run the engine
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    // Continuous stirring effect (Wind/Blowing from bottom or sides)
    let stirInterval: ReturnType<typeof setInterval>;
    
    // Wait for 1.2 seconds (balls to fall and hit the bottom) before applying the wind
    const delayTimer = setTimeout(() => {
      // Close the lid so balls don't fly out!
      Matter.World.add(world, [roofBoundary]);

      stirInterval = setInterval(() => {
        balls.forEach(ball => {
          const baseForceX = 0.03;
          const baseForceY = 0.06;

          Matter.Body.applyForce(ball, ball.position, {
            x: (Math.random() - 0.5) * baseForceX * windForce, 
            y: -0.01 - (Math.random() * baseForceY * windForce) 
          });
        });
      }, 100);
    }, 1200);

    // Sync body positions to React State for DOM rendering
    Matter.Events.on(engine, 'afterUpdate', () => {
      const updatedBalls = balls.map(b => ({
        id: b.id,
        x: b.position.x,
        y: b.position.y,
        angle: b.angle,
        src: (b as any).avatarSrc,
      }));
      setBallData(updatedBalls);
    });

    // 6. Set timeout to end animation early and cleanup
    const timer = setTimeout(() => {
        onAnimationEnd();
    }, duration);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      clearTimeout(delayTimer);
      if (stirInterval) clearInterval(stirInterval);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      if (render.canvas) render.canvas.remove();
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [onAnimationEnd, duration, windForce]);

  return (
    <div className="w-[350px] h-[350px] rounded-full overflow-hidden relative shadow-inner bg-white/50 border-8 border-pink-100 flex items-center justify-center pointer-events-none">
      <div ref={sceneRef} className="absolute inset-0" />
      
      {/* Render Avatars perfectly circular via DOM */}
      {ballData.map(ball => (
        <img 
          key={ball.id}
          src={ball.src}
          className="absolute rounded-full object-cover shadow-md border-2 border-white"
          style={{
            width: 60, // radius * 2
            height: 60,
            left: ball.x - 30, // x - radius
            top: ball.y - 30,  // y - radius
            transform: `rotate(${ball.angle}rad)`,
          }}
          alt=""
        />
      ))}
    </div>
  );
}
