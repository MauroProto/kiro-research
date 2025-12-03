"use client";

import { useState, useEffect, useRef } from "react";

interface GhostScreensaverProps {
  idleTimeout?: number;
  duration?: number;
}

export function GhostScreensaver({ 
  idleTimeout = 10000, // 10 seconds for testing
  duration = 12000
}: GhostScreensaverProps) {
  const [isActive, setIsActive] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [position, setPosition] = useState({ x: -100, y: 50 });
  const directionRef = useRef({ x: 1, y: 1 });
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track last activity time
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      
      // If screensaver is active, dismiss it
      if (isActive && !isLeaving) {
        setIsLeaving(true);
        setTimeout(() => {
          setIsActive(false);
          setIsLeaving(false);
        }, 400);
      }
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Check for idle every second
    checkIntervalRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      
      if (idleTime >= idleTimeout && !isActive) {
        setIsActive(true);
        setIsLeaving(false);
        setPosition({ x: -80, y: 30 + Math.random() * 40 });
        directionRef.current = { x: 1, y: Math.random() > 0.5 ? 1 : -1 };
        
        // Auto-dismiss after duration
        setTimeout(() => {
          setIsLeaving(true);
          setTimeout(() => {
            setIsActive(false);
            setIsLeaving(false);
          }, 400);
        }, duration);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [idleTimeout, duration, isActive, isLeaving]);

  // Animate ghost
  useEffect(() => {
    if (!isActive || isLeaving) return;

    const interval = setInterval(() => {
      setPosition(prev => {
        let newX = prev.x + directionRef.current.x * 3;
        let newY = prev.y + directionRef.current.y * 0.3;

        // Bounce
        if (newX > window.innerWidth - 100) {
          directionRef.current.x = -1;
        } else if (newX < 0) {
          directionRef.current.x = 1;
        }
        if (newY > 70) {
          directionRef.current.y = -1;
        } else if (newY < 20) {
          directionRef.current.y = 1;
        }

        return { x: newX, y: newY };
      });
    }, 25);

    return () => clearInterval(interval);
  }, [isActive, isLeaving]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <img
        src="/ghost.png"
        alt="ghost screensaver"
        className={`absolute transition-opacity duration-300 ${isLeaving ? "opacity-0" : "opacity-40"}`}
        style={{
          width: "100px",
          height: "100px",
          left: `${position.x}px`,
          top: `${position.y}%`,
          transform: `scaleX(${directionRef.current.x > 0 ? 1 : -1}) rotate(${Math.sin(Date.now() / 200) * 15}deg)`,
          filter: "drop-shadow(0 0 20px rgba(144, 70, 255, 0.4)) blur(0.5px)",
        }}
      />
    </div>
  );
}
