import clsx from 'clsx';
import { cloneElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { throttle } from '~/utils';
import styles from './tooltip.module.scss';

const TOOLTIP_HOVER_DELAY = 300; // In milliseconds

interface TooltipProps {
  title: React.ReactNode;
  position?: 'top' | 'bottom';
  variant?: 'info' | 'error';
  maxWidth?: number;
  maxHeight?: number;
  isInteractive?: boolean;
  children: React.ReactElement;
}

function Tooltip({
  children,
  title,
  position = 'top',
  variant = 'info',
  maxWidth,
  maxHeight,
  isInteractive
}: TooltipProps) {
  const anchorRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (!anchorRef.current) {
      return;
    }

    const anchorNode = anchorRef.current;

    const startHoverTimeout = () => {
      cancelHoverTimeout();
      hoverTimerRef.current = setTimeout(() => {
        setIsShown(true);
      }, TOOLTIP_HOVER_DELAY);
    };

    const cancelHoverTimeout = () => {
      clearTimeout(hoverTimerRef.current);
    };

    const hideTooltip = throttle((e: Event) => {
      // Don't hide the tooltip if the cursor is over the anchor node
      // or the tooltip content
      if (isInteractive && tooltipRef.current && anchorRef.current) {
        if (
          e.target != window &&
          (anchorRef.current.contains(e.target as HTMLElement) ||
            tooltipRef.current.contains(e.target as HTMLElement))
        ) {
          return;
        }
      }
      clearTimeout(hoverTimerRef.current);
      setIsShown(false);
    }, 50);

    anchorNode.addEventListener('mouseenter', startHoverTimeout);
    anchorNode.addEventListener('mouseleave', cancelHoverTimeout);

    if (isShown) {
      if (isInteractive) {
        document.addEventListener('mousemove', hideTooltip);
      } else {
        anchorNode.addEventListener('mouseleave', hideTooltip);
      }
      document.addEventListener('mousedown', hideTooltip);
      document.addEventListener('scroll', hideTooltip);
      document.addEventListener('wheel', hideTooltip);
      window.addEventListener('resize', hideTooltip);
    }

    return () => {
      anchorNode?.removeEventListener('mouseenter', startHoverTimeout);
      anchorNode?.removeEventListener('mouseleave', cancelHoverTimeout);
      anchorNode?.removeEventListener('mouseleave', hideTooltip);
      document.removeEventListener('mousemove', hideTooltip);
      document.removeEventListener('mousedown', hideTooltip);
      document.removeEventListener('scroll', hideTooltip);
      document.removeEventListener('wheel', hideTooltip);
      window.removeEventListener('resize', hideTooltip);
      cancelHoverTimeout();
    };
  }, [title, isInteractive, isShown]);

  useLayoutEffect(() => {
    const anchorNode = anchorRef.current;
    const tooltipNode = tooltipRef.current;

    if (!isShown || !tooltipNode || !anchorNode) {
      return;
    }

    const offsetX = 6;
    const offsetY = 6;

    const {
      top: anchorTop,
      left: anchorLeft,
      bottom: anchorBottom,
      width: anchorWidth,
      height: anchorHeight
    } = anchorNode.getBoundingClientRect();
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
    const maxTooltipWidth = maxWidth ?? 400;
    const maxTooltipHeight = maxHeight ?? 240;

    tooltipRef.current.style.maxWidth = `${maxTooltipWidth}px`;
    tooltipRef.current.style.maxHeight = `${
      Math.min(position == 'top' ? anchorTop : windowHeight - anchorBottom, maxTooltipHeight) -
      offsetY
    }px`;

    const { width: tooltipWidth, height: tooltipHeight } = tooltipNode.getBoundingClientRect();

    let deltaX = 0;
    let deltaY = 0;

    switch (position) {
      case 'top':
        deltaX += (anchorWidth - tooltipWidth) / 2;
        deltaY -= tooltipHeight;
        break;
      case 'bottom':
        deltaX += (anchorWidth - tooltipWidth) / 2;
        deltaY += anchorHeight;
        break;
    }

    const top = Math.max(
      offsetY,
      Math.min(anchorTop + deltaY, windowHeight - tooltipHeight - offsetY)
    );
    const left = Math.max(
      offsetX,
      Math.min(anchorLeft + deltaX, windowWidth - tooltipWidth - offsetX)
    );

    let pointerOffset = tooltipWidth / 2 - anchorWidth / 2 - anchorLeft + left;
    const pointerWidth = 6;
    const maxPointerOffset = tooltipWidth / 2 - pointerWidth;

    if (Math.abs(pointerOffset) > Math.abs(maxPointerOffset)) {
      pointerOffset = Math.sign(pointerOffset) * maxPointerOffset;
    }

    requestAnimationFrame(() => {
      if (tooltipRef.current) {
        tooltipRef.current.style.top = `${top}px`;
        tooltipRef.current.style.left = `${left}px`;
        tooltipRef.current.style.setProperty('--pointer-offset', `${0 - pointerOffset}px`);
      }
    });
  }, [title, position, isShown, maxWidth, maxHeight]);

  return (
    <>
      {title ? cloneElement(children, { ref: anchorRef }) : children}
      {!!title &&
        isShown &&
        createPortal(
          <div
            ref={tooltipRef}
            className={clsx(
              styles.root,
              styles[position],
              isShown && styles.isShown,
              isInteractive && styles.isInteractive,
              variant == 'error' && styles.isError
            )}
          >
            <div className={styles.inner}>
              <div className={styles.content}>{title}</div>
              <div className={styles.pointer} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default Tooltip;
