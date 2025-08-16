import { type SubscribeFunc } from 'matchina'
import { useEffect, useCallback } from 'react'

// Original useEvent hook - expects memoized handlers from consumers
function useEvent<T>(event: SubscribeFunc<T>, handler: (ev: T) => void ) {
  useEffect(() => {
    const unsubscribe = event(handler);
    return unsubscribe;
  }, [event, handler]);
}

// Simple hook that combines useEvent with useCallback
export function useEventCallback<T>(event: SubscribeFunc<T>, callback: (ev: T) => void) {  
  return useEvent(event, useCallback(callback, []));
}
