// @ts-ignore
import confetti from "canvas-confetti";

export const useConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
  };

  const fire = (particleRatio: number, opts: any) => {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  };

  const fireCanon = () => {
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const fireSchoolPride = (durationInSeconds: number) => {
    const end = Date.now() + durationInSeconds * 1000;

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  return {
    fireCanon,
    fireSchoolPride,
  };
};
