import React from 'react';

/* shadcn Card composition pattern (registry/new-york-v4 card-demo),
   restyled as NAJDDA glass: translucent surface + hairline border +
   semantic ink only. No raw colors, no theme overrides — dark mode free. */

const cx = (...parts) => parts.filter(Boolean).join(' ');

export const Card = ({ className = '', children, ...props }) => (
  <section
    className={cx('glass rounded-ui-xl p-8 transition-all duration-300', className)}
    {...props}
  >
    {children}
  </section>
);

export const CardHeader = ({ className = '', children, ...props }) => (
  <div className={cx('mb-6 flex flex-col gap-1.5', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', children, ...props }) => (
  <h3 className={cx('text-2xl font-black tracking-tight text-ink', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = '', children, ...props }) => (
  <p className={cx('text-sm font-medium leading-relaxed text-ink-muted', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = '', children, ...props }) => (
  <div className={cx('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...props }) => (
  <div className={cx('mt-8 flex items-center gap-2', className)} {...props}>
    {children}
  </div>
);
