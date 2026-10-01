import React from 'react';
import { useTranslation } from '../../features/i18n/I18nContext';

/**
 * Directional icon that mirrors itself in RTL.
 *
 * `ArrowLeft` means "back". Rendered as-is under `dir="rtl"` the glyph points
 * the wrong way — the back arrow has to point right when the reading direction
 * is right-to-left. A CSS transform would also flip any non-directional icon
 * (phone, shield, medical cross), so the flip is applied per icon here, only
 * to the ones that encode a direction.
 */
const DIRECTIONAL = new Set(['ArrowLeft', 'ChevronRight', 'ChevronLeft', 'ArrowRight']);

export const DirIcon = ({ name: Name, ...props }) => {
  const { isRTL } = useTranslation();
  if (!DIRECTIONAL.has(Name?.name ?? Name?.displayName)) return <Name {...props} />;
  return (
    <Name
      {...props}
      style={{ ...(props.style || {}), transform: isRTL ? 'scaleX(-1)' : undefined }}
    />
  );
};

export default DirIcon;
