import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

/**
 * NairaIcon (₦) - Vector icon for Nigerian Naira
 * Drop-in replacement for AttachMoney
 */
export const NairaIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M5.5 3.5h2.4l7.6 13.5V3.5h2.5v17h-2.4L8 7v13.5H5.5V3.5z M3.5 9.2h17v1.8h-17V9.2zm0 3.8h17v1.8h-17V13z"
    />
  </SvgIcon>
);

/**
 * NairaCircleIcon (₦ Coin) - Circular coin icon containing the Nigerian Naira symbol
 * Drop-in replacement for MonetizationOn and Paid
 */
export const NairaCircleIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    {/* Outer circle ring */}
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
    {/* Centered Naira symbol */}
    <path
      fill="currentColor"
      d="M7.8 6.5h1.7l5.2 8.8V6.5h1.7v11h-1.7L9.5 8.7v8.8H7.8V6.5z M6.2 10.5h11.6v1.4H6.2v-1.4z M6.2 12.8h11.6v1.4H6.2v-1.4z"
    />
  </SvgIcon>
);

export default NairaIcon;
