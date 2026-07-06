import { useEffect, useRef } from 'react';

/**
 * useModalNavigation
 *
 * Handles two behaviors for any modal/dropdown:
 * 1. ESC key → calls onClose()
 * 2. Mobile back button (popstate) → calls onClose() instead of navigating away
 *
 * Strategy: push a dummy history entry when the modal opens,
 * so the back button pops that entry first (triggering our handler)
 * rather than navigating to the previous page.
 * When the modal is closed from inside (X button, backdrop, etc.),
 * we call history.back() to clean up the dummy entry.
 */
export function useModalNavigation(isOpen: boolean, onClose: () => void) {
  // Track whether WE pushed a history entry (so we know when to call history.back())
  const pushedState = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      // Modal just closed — if we had pushed a state, pop it
      if (pushedState.current) {
        pushedState.current = false;
        history.back();
      }
      return;
    }

    // Modal just opened — push a dummy state so back button hits this first
    history.pushState({ modal: true }, '');
    pushedState.current = true;

    // ESC key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Mark as false BEFORE calling onClose so that onClose
        // doesn't trigger another history.back() in the effect above.
        pushedState.current = false;
        history.back(); // pop the dummy state
        onClose();
      }
    };

    // Back button (popstate) handler
    const handlePopState = () => {
      // The dummy history entry was already popped by the browser.
      pushedState.current = false;
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);
}
