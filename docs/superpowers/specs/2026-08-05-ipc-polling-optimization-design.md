# Optimize React/Electron IPC Polling

## Goal
Eliminate unnecessary `setInterval` polling in React components by converting them to an Event-Driven architecture using Electron IPC events.

## Background Context
Currently, core components like `App.tsx`, `TopBar.tsx`, `SettingsPage.tsx`, `BrowserView.tsx`, and `SidePanel.tsx` use `setInterval` inside `useEffect` hooks to repeatedly query the Electron backend every 1-3 seconds for data such as MCP Status, Extension Lists, and active processes. This polling model wastes CPU cycles, increases battery drain, and triggers excessive React component re-renders.

## Proposed Changes

### 1. Identify and Remove all `setInterval` IPC Polling
Search and remove all instances of `setInterval` that are used to fetch data from Electron APIs in the React frontend.
- `App.tsx`
- `TopBar.tsx`
- `SettingsPage.tsx`
- `BrowserView.tsx`
- `SidePanel.tsx`

### 2. Implement Event-Driven Updates
Instead of polling, the React components should fetch the data once on mount, and then rely strictly on IPC event listeners (e.g. `onExtensionChanged`, `onMcpClientChanged`) to trigger state updates.
- If an event listener is missing in `preload.ts` or `main.ts`, we will add it.
- Components will re-fetch or update state *only* when the corresponding IPC event fires.

## Testing & Verification
- Verify that extensions are still listed accurately.
- Verify that the MCP client status badge updates in real-time when the MCP server state changes.
- Ensure that the console does not show repeated network/IPC fetch calls every few seconds.
- Monitor CPU usage to ensure a reduction in idle load.
