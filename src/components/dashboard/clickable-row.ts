import type * as React from 'react';

export function handleClickableRowKeyDown(
  event: React.KeyboardEvent<HTMLElement>,
  onActivate: () => void
) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  onActivate();
}

export function stopClickableRowPropagation(
  event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
) {
  event.stopPropagation();
}
