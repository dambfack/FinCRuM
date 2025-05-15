
'use client';

import type { RefObject } from 'react';
import { useEffect, useCallback } from 'react';

export function useTiltEffect(cardRef: RefObject<HTMLElement>) {
  const rotateToMouse = useCallback(
    (e: MouseEvent, cardElement: HTMLElement, bounds: DOMRect) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const leftX = mouseX - bounds.left; // Corrected from bounds.x
      const topY = mouseY - bounds.top; // Corrected from bounds.y
      const center = {
        x: leftX - bounds.width / 2,
        y: topY - bounds.height / 2,
      };
      // Adding 1 to distance to avoid log(0) or log of small numbers close to 0
      const distance = Math.sqrt(center.x ** 2 + center.y ** 2) + 1;

      cardElement.style.transform = `
        scale3d(1.05, 1.05, 1.05) /* Slightly reduced scale for less jarring effect */
        rotate3d(
          ${center.y / 100},
          ${-center.x / 100},
          0,
          ${Math.min(Math.log(distance) * 2, 30)}deg /* Capped max rotation */
        )
      `;

      const glowElement = cardElement.querySelector('.glow') as HTMLElement | null;
      if (glowElement) {
        glowElement.style.backgroundImage = `
          radial-gradient(
            circle at
            ${center.x * 2 + bounds.width / 2}px
            ${center.y * 2 + bounds.height / 2}px,
            hsla(var(--card-foreground) / 0.07), /* Adjusted glow color to use theme variable */
            hsla(var(--card-foreground) / 0.01) /* Adjusted glow color to use theme variable */
          )
        `;
      }
    },
    []
  );

  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    let bounds: DOMRect;
    let currentRotateToMouse: ((e: MouseEvent) => void) | null = null;

    const onMouseEnter = () => {
      bounds = cardElement.getBoundingClientRect();
      currentRotateToMouse = (e: MouseEvent) => rotateToMouse(e, cardElement, bounds);
      document.addEventListener('mousemove', currentRotateToMouse);
    };

    const onMouseLeave = () => {
      if (currentRotateToMouse) {
        document.removeEventListener('mousemove', currentRotateToMouse);
        currentRotateToMouse = null;
      }
      cardElement.style.transform = '';
      const glowElement = cardElement.querySelector('.glow') as HTMLElement | null;
      if (glowElement) {
        glowElement.style.backgroundImage = '';
      }
    };

    cardElement.addEventListener('mouseenter', onMouseEnter);
    cardElement.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cardElement.removeEventListener('mouseenter', onMouseEnter);
      cardElement.removeEventListener('mouseleave', onMouseLeave);
      if (currentRotateToMouse) {
        document.removeEventListener('mousemove', currentRotateToMouse);
      }
    };
  }, [cardRef, rotateToMouse]);
}
