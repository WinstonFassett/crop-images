# FUCKERY.md: Report on Branch Issues

## Duplicate Code & Implementation Issues

1. **Multiple Debounce Functions**
   - Duplicate debounce implementations instead of a single utility function
   - Unnecessary debounced calls to `updateCropStats` causing infinite update loops
   - Debounced `updateCropConfig` calls that conflict with direct calls

2. **Contradictory Implementations**
   - Direct calls to `updateCropStats` alongside debounced calls to the same function
   - Multiple event handlers updating the same state in different ways
   - Inconsistent handling of crop stats updates between zoom and crop events

3. **Broken File Handling**
   - Inconsistent function signatures in `useCropItem` hook
   - Improper file handling causing black box rendering
   - Incorrect object URL management leading to memory leaks

## Cruft & Code Quality Issues

1. **Backup Files**
   - `.bak` files left in the codebase
   - `.fixed.ts` files with duplicate code
   - Multiple versions of the same file with slight variations

2. **Unused Code**
   - Dead code paths that never execute
   - Commented out code blocks that should be deleted
   - Unused imports and variables

3. **Excessive Comments & Debug Code**
   - Excessive console.log statements everywhere
   - Debug date displays in UI components
   - Commented out code with no explanation

4. **TODOs & FIXMEs**
   - Numerous TODOs without follow-up
   - FIXMEs indicating known bugs that weren't addressed
   - Incomplete implementations marked with comments

5. **Hackery Without Justification**
   - Random setTimeout calls with magic numbers
   - Forced timestamp updates as a hack to trigger reactivity
   - Manual DOM manipulation outside of React's lifecycle

## Architectural Issues

1. **State Management Problems**
   - Multiple sources of truth for the same data
   - Inconsistent state update patterns
   - Direct store access from components instead of hooks

2. **Event Handling Issues**
   - Duplicate event handlers for the same events
   - Missing cleanup for event listeners
   - Improper event propagation

3. **Resource Management**
   - Improper cleanup of object URLs
   - Cropper instances not properly destroyed
   - Memory leaks from unmanaged resources

## Build & Import Issues

1. **Import Path Problems**
   - References to non-existent files (`qualityUtils`, `cropperUtils`)
   - Inconsistent import patterns
   - Missing or duplicate imports

2. **Build Configuration**
   - Large bundle size warnings being ignored
   - No code splitting strategy
   - No optimization for production builds

## Next Steps for Cleanup

1. Remove all backup files and duplicate implementations
2. Establish a single source of truth for all state
3. Implement proper resource management with cleanup
4. Remove all debug code, console logs, and excessive comments
5. Fix the function signatures and file handling
6. Ensure consistent patterns for state updates and event handling
7. Address build optimization warnings
