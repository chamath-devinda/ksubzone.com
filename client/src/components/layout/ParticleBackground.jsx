'use client';

import { useMemo, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ParticleBackground() {
  const [particlesLoaded, setParticlesLoaded] = useState(false);
  const [modules, setModules] = useState(null);
  const [isMobile, setIsMobile] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/management')) return;

    let mounted = true;
    Promise.all([
      import("@tsparticles/react"),
      import("@tsparticles/slim")
    ]).then(([reactParticles, slimModule]) => {
      if (!mounted) return;
      setModules({
        Particles: reactParticles.default || reactParticles.Particles,
        ParticlesProvider: reactParticles.ParticlesProvider,
        initParticles: async (engine) => {
          await slimModule.loadSlim(engine);
        }
      });
      setIsMobile(window.innerWidth < 768);
      setParticlesLoaded(true);
    }).catch((err) => {
      console.warn("Failed to load particles:", err);
    });

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      mounted = false;
      window.removeEventListener("resize", checkMobile);
    };
  }, [pathname]);

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
  if (!particlesLoaded || !modules) return null;

  const { Particles, ParticlesProvider, initParticles } = modules;

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
