import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { Bot, Shield, Columns, Zap, Lock, Terminal } from 'lucide-react';

export interface BentoCardProps {
  id: string;
  title: string;
  description: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const cardData: BentoCardProps[] = [
  {
    id: 'agent',
    title: 'Autonomous Local AI Agent',
    description: 'On-device neural inference with Llama 3.2 3B & Phi 3.5 Vision. Deep DOM parsing and form execution with 0% cloud data transmission.',
    label: 'WebGPU Inference',
    icon: Bot,
    tag: 'ON-DEVICE',
  },
  {
    id: 'crypto',
    title: 'Zero-Knowledge Crypto Vault',
    description: 'AES-256-GCM client-side encryption. Secure multi-device synchronization for workspaces, bookmarks, and passwords.',
    label: 'End-to-End Cryptography',
    icon: Lock,
    tag: 'AES-256-GCM',
  },
  {
    id: 'split',
    title: 'Dual-View Split Workspace',
    description: 'Work simultaneously across two independent webview processes with synchronized scrolling and seamless drag-and-drop.',
    label: 'Parallel Tiling',
    icon: Columns,
    tag: 'SPLIT-VIEW',
  },
  {
    id: 'privacy',
    title: 'Sub-ms Privacy Shield',
    description: 'Native Rust and Electron network interception layer stopping advertising beacons and tracking payloads before DOM evaluation.',
    label: 'Tracker Eradication',
    icon: Shield,
    tag: '0ms DEFENSE',
  },
  {
    id: 'mcp',
    title: 'Local MCP Server Bridge',
    description: 'Integrated MCP server running on localhost with secure token authentication for terminal and local LLM orchestration.',
    label: 'Protocol Integration',
    icon: Terminal,
    tag: 'PORT 3020',
  },
  {
    id: 'omnibox',
    title: '0ms Predictive Omnibox',
    description: 'In-memory LRU cache coupled with staggered 35ms fallback network queries for instant keystroke rendering.',
    label: 'Search Engine',
    icon: Zap,
    tag: 'LRU CACHE',
  },
];

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '99, 102, 241'; // Indigo RGB
const MOBILE_BREAKPOINT = 768;

const createParticleElement = (x: number, y: number, color: string = DEFAULT_GLOW_COLOR): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 8px rgba(${color}, 0.8);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}> = ({
  children,
  className = '',
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = true,
  enableMagnetism = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();
    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        },
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();

    for (let i = 0; i < particleCount; i++) {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;
        const x = Math.random() * width;
        const y = Math.random() * height;
        const particle = createParticleElement(x, y, glowColor);
        cardRef.current.appendChild(particle);
        particlesRef.current.push(particle);

        gsap.fromTo(
          particle,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' }
        );

        gsap.to(particle, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true,
        });
      }, i * 100);
      timeoutsRef.current.push(timeoutId);
    }
  }, [particleCount, glowColor]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;
    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();
      gsap.to(element, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 1000,
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.04;
        const magnetY = (y - centerY) * 0.04;
        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(${glowColor}, 0.4);
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
        z-index: 1000;
      `;
      element.appendChild(ripple);
      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        { scale: 40, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ripple.remove() }
      );
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div ref={cardRef} className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      {children}
    </div>
  );
};

export const MagicBentoGrid: React.FC = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!gridRef.current) return;
      const cards = gridRef.current.querySelectorAll('.magic-bento-card');

      cards.forEach((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
        (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
        (card as HTMLElement).style.setProperty('--spotlight-radius', `${DEFAULT_SPOTLIGHT_RADIUS}px`);
        (card as HTMLElement).style.setProperty('--glow-color', `rgba(${DEFAULT_GLOW_COLOR}, 0.15)`);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  return (
    <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
      <style>{`
        .bento-grid-custom {
          display: grid;
          gap: 1.25rem;
          width: 100%;
          grid-template-columns: repeat(1, 1fr);
        }
        
        @media (min-width: 640px) {
          .bento-grid-custom {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1024px) {
          .bento-grid-custom {
            grid-template-columns: repeat(3, 1fr);
          }
          .bento-card-0 { grid-column: span 2; }
          .bento-card-1 { grid-column: span 1; }
          .bento-card-2 { grid-column: span 1; }
          .bento-card-3 { grid-column: span 2; }
          .bento-card-4 { grid-column: span 1; }
          .bento-card-5 { grid-column: span 2; }
        }

        .magic-bento-card {
          background: #0a041a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.3s ease, transform 0.3s ease;
        }

        .magic-bento-card:hover {
          border-color: rgba(${DEFAULT_GLOW_COLOR}, 0.4);
        }

        .spotlight-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            var(--spotlight-radius, 300px) circle at var(--mouse-x, 0px) var(--mouse-y, 0px),
            var(--glow-color, rgba(99, 102, 241, 0.15)),
            transparent 80%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .magic-bento-card:hover .spotlight-overlay {
          opacity: 1;
        }

        .border-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          padding: 1px;
          background: radial-gradient(
            var(--spotlight-radius, 300px) circle at var(--mouse-x, 0px) var(--mouse-y, 0px),
            rgba(${DEFAULT_GLOW_COLOR}, 0.8),
            transparent 40%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .magic-bento-card:hover .border-glow {
          opacity: 1;
        }
      `}</style>

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-20">
        <span className="font-mono text-xs uppercase tracking-widest text-indigo-400 font-semibold">
          CORE CAPABILITIES MATRIX
        </span>
        <h2 className="font-sans font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight mt-3">
          Engineered for <span className="text-indigo-400">Total Sovereignty</span>.
        </h2>
        <p className="font-body text-slate-400 mt-4 text-base sm:text-lg leading-relaxed">
          Hover over each module to experience real-time magnetic 3D physics, dynamic particle emission, and reactive spotlight rendering.
        </p>
      </div>

      {/* Interactive Bento Grid */}
      <div ref={gridRef} className="bento-grid-custom">
        {cardData.map((card, index) => {
          const Content = (
            <div className="magic-bento-card h-full w-full p-8 flex flex-col justify-between group min-h-[260px] cursor-pointer">
              <div className="spotlight-overlay" />
              <div className="border-glow" />

              {/* Card Header */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-md">
                  {React.createElement(card.icon, { className: 'w-5 h-5' })}
                </div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-300/70 uppercase bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-500/20">
                  {card.tag}
                </span>
              </div>

              {/* Title & Description */}
              <div className="relative z-10 my-4">
                <span className="text-xs font-mono font-medium tracking-wider text-purple-300 uppercase block mb-1">
                  // {card.label}
                </span>
                <h3 className="text-2xl font-bold text-white group-hover:text-indigo-200 transition-colors">
                  {card.title}
                </h3>
              </div>

              <div className="relative z-10">
                <p className="text-sm text-slate-300 leading-relaxed font-body font-normal">
                  {card.description}
                </p>
              </div>
            </div>
          );

          return (
            <ParticleCard
              key={card.id}
              className={`magic-bento-card bento-card-${index}`}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={true}
              enableMagnetism={true}
              clickEffect={true}
              disableAnimations={isMobile}
            >
              {Content}
            </ParticleCard>
          );
        })}
      </div>
    </section>
  );
};

export default MagicBentoGrid;
