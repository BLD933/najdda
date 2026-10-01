import React, { useRef } from 'react';

/**
 * ARIA radio group with a roving tabindex.
 *
 * The APG pattern is one tab stop for the whole group, arrow keys to move
 * between radios. Both switchers (theme, language) previously rendered N focusable
 * buttons, so a keyboard user tabbed through 3–5 stops to get past a control
 * that logically holds a single value.
 */
const RovingRadioGroup = ({ role = 'radiogroup', ariaLabel, className = '', children, onKeyDown }) => {
  const ref = useRef(null);

  const handleKeyDown = (e) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(e.key)) {
      onKeyDown?.(e);
      return;
    }
    const radios = Array.from(ref.current?.querySelectorAll('[role="radio"]') || []);
    if (radios.length === 0) return;
    e.preventDefault();
    const current = radios.indexOf(document.activeElement);
    // In RTL, ArrowRight must move to the PREVIOUS item: the visual order is
    // mirrored, so the key that means "forward" depends on the reading direction.
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    const backward = rtl ? e.key === 'ArrowRight' : e.key === 'ArrowLeft';
    let next = current;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = radios.length - 1;
    else if (forward) next = (current + 1 + radios.length) % radios.length;
    else if (backward) next = (current - 1 + radios.length) % radios.length;
    else return;
    radios[next]?.focus();
    radios[next]?.click();
  };

  return (
    <div ref={ref} role={role} aria-label={ariaLabel} onKeyDown={handleKeyDown} className={className}>
      {children}
    </div>
  );
};

export default RovingRadioGroup;
