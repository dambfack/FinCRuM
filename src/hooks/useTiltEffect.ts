
'use client';

import type { RefObject } from 'react';
import { useEffect, useCallback } from 'react';

export function useTiltEffect(cardRef: RefObject<HTMLElement>) {
  const rotateToMouse = useCallback(
    (e: MouseEvent, cardElement: HTMLElement, bounds: DOMRect) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const leftX = mouseX - bounds.left;
      const topY = mouseY - bounds.top;
      const center = {
        x: leftX - bounds.width / 2,
        y: topY - bounds.height / 2,
      };
      // Adding 1 to distance to avoid log(0) or log of small numbers close to 0
      const distance = Math.sqrt(center.x ** 2 + center.y ** 2) + 1;

      cardElement.style.transform = `
        scale3d(1.03, 1.03, 1.03) /* Reduced scale for subtlety */
        rotate3d(
          ${center.y / 150}, /* Increased divisor for less tilt */
          ${-center.x / 150}, /* Increased divisor for less tilt */
          0,
          ${Math.min(Math.log(distance) * 1.5, 20)}deg /* Reduced angle and cap */
        )
      `;

      const glowElement = cardElement.querySelector('.glow') as HTMLElement | null;
      if (glowElement) {
        glowElement.style.backgroundImage = `
          radial-gradient(
            circle at
            ${center.x * 2 + bounds.width / 2}px
            ${center.y * 2 + bounds.height / 2}px,
            hsla(var(--card-foreground) / 0.05), /* Reduced glow opacity */
            hsla(var(--card-foreground) / 0.005) /* Reduced glow opacity */
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
