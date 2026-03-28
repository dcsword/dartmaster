import { useRef } from 'react';

export default function DragHandle({ index, listRef, onDragStart, onDragOver, onDrop }) {
  const ghostRef = useRef(null);
  const isDragging = useRef(false);
  const startY = useRef(0);

  function createGhost(event) {
    if (!listRef?.current) return;

    const rows = listRef.current.querySelectorAll('[data-row-index]');
    const sourceRow = rows[index];
    if (!sourceRow) return;

    const rect = sourceRow.getBoundingClientRect();
    startY.current = event.touches[0].clientY;

    const ghost = sourceRow.cloneNode(true);
    ghost.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      z-index: 9999;
      pointer-events: none;
      opacity: 0.9;
      background: var(--bg2);
      border: 1px solid var(--accent);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      transition: none;
    `;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    sourceRow.style.opacity = '0.3';
  }

  function moveGhost(event) {
    if (!ghostRef.current || !listRef?.current) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - startY.current;
    const ghost = ghostRef.current;
    const currentTop = parseFloat(ghost.style.top);

    ghost.style.top = `${currentTop + deltaY}px`;
    startY.current = touch.clientY;

    const rows = listRef.current.querySelectorAll('[data-row-index]');
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const rowMiddle = rect.top + rect.height / 2;
      if (touch.clientY < rect.top || touch.clientY > rect.bottom) continue;

      const targetIndex = parseInt(row.dataset.rowIndex, 10);
      onDragOver(targetIndex);
      rows.forEach(currentRow => {
        currentRow.style.borderTop = '';
        currentRow.style.borderBottom = '';
      });

      if (targetIndex !== index) {
        if (touch.clientY < rowMiddle) row.style.borderTop = '2px solid var(--accent)';
        if (touch.clientY >= rowMiddle) row.style.borderBottom = '2px solid var(--accent)';
      }
      break;
    }
  }

  function removeGhost() {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }

    if (!listRef?.current) return;
    const rows = listRef.current.querySelectorAll('[data-row-index]');
    rows.forEach(row => {
      row.style.opacity = '';
      row.style.borderTop = '';
      row.style.borderBottom = '';
    });
  }

  function handleTouchStart(event) {
    event.preventDefault();
    isDragging.current = true;
    onDragStart(index);
    createGhost(event);
  }

  function handleTouchMove(event) {
    if (!isDragging.current) return;
    event.preventDefault();
    moveGhost(event);
  }

  function handleTouchEnd() {
    isDragging.current = false;
    removeGhost();
    onDrop();
  }

  return (
    <div
      className="setup-drag-handle"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      ⠿
    </div>
  );
}
