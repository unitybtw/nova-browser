import React from 'react';

export interface FluteProjectPreviewProps {
  children: React.ReactNode;
  enabled?: boolean;
  active?: boolean;
  [key: string]: any;
}

export function FluteProjectPreview(props: FluteProjectPreviewProps): React.ReactElement;
