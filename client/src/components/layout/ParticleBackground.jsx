'use client';

import { useMemo, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

// Stable initialization callback defined outside the component
const initParticles = async (engine) => {
  await loadSlim(engine);
};

export default function ParticleBackground() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    setShouldRender(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const options = useMemo(
    () => {
      if (isMobile) {
        return {
          fullScreen: {
            enable: true,
            zIndex: 0,
          },
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 40,
          interactivity: {
            detectsOn: "window",
            events: {
              onClick: {
                enable: false,
              },
              onHover: {
                enable: false,
              },
              resize: true,
            },
          },
          particles: {
            color: {
              value: ["#ffffff", "#c4b5fd", "#f0abfc"],
            },
            links: {
              color: "#8b5cf6",
              distance: 120,
              enable: true,
              opacity: 0.12,
              width: 0.7,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "out",
              },
              random: true,
              speed: 0.45,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 28,
            },
            opacity: {
              value: 0.34,
              animation: {
                enable: true,
                speed: 0.6,
                minimumValue: 0.12,
              }
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 2.4 },
              animation: {
                enable: true,
                speed: 1,
                minimumValue: 0.7,
              }
            },
          },
          detectRetina: true,
        };
      }

      // Desktop layout - subtle particles over the matte-black page base
      return {
        fullScreen: {
          enable: true,
          zIndex: 0,
        },
        background: {
          color: {
            value: "transparent",
          },
        },
        fpsLimit: 60,
        interactivity: {
          detectsOn: "window",
          events: {
            onClick: {
              enable: true,
              mode: "push",
            },
            onHover: {
              enable: true,
              mode: "grab",
            },
            resize: true,
          },
          modes: {
            push: {
              quantity: 2,
            },
            grab: {
              distance: 150,
              links: {
                opacity: 0.6,
              },
            },
          },
        },
        particles: {
          color: {
            value: ["#ffffff", "#c4b5fd", "#f0abfc"],
          },
          links: {
            color: "#8b5cf6",
            distance: 125,
            enable: true,
            opacity: 0.14,
            width: 0.75,
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "out",
            },
            random: true,
            speed: 0.5,
            straight: false,
          },
          number: {
            density: {
              enable: true,
              area: 800,
            },
            value: 60,
          },
          opacity: {
            value: 0.38,
            animation: {
              enable: true,
              speed: 0.8,
              minimumValue: 0.12,
            }
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 2.7 },
            animation: {
              enable: true,
              speed: 1.5,
              minimumValue: 0.7,
            }
          },
          shadow: {
            enable: true,
            color: "#8b5cf6",
            blur: 3,
          }
        },
        detectRetina: true,
      };
    },
    [isMobile],
  );

  if (pathname?.startsWith('/management')) return null;
  if (!mounted || !shouldRender) return null;

  return (
    <ParticlesProvider init={initParticles}>
      <Particles
        id="tsparticles"
        options={options}
        className="fixed inset-0 pointer-events-none"
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: "none" }}
      />
    </ParticlesProvider>
  );
}
