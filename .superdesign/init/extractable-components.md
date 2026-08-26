# Extractable Components Catalog

## TopBar
- Source: `src/components/TopBar.tsx`
- Category: layout
- Description: Window chrome, navigation controls, and URL omnibox
- Extractable props: activeTab (Tab), isIncognito (boolean), currentUrl (string)
- Hardcoded: Navigation icons, tab styling, window drag-region

## SidebarTabs
- Source: `src/components/SidebarTabs.tsx`
- Category: layout
- Description: Vertical tab strip with folder grouping and workspace switching
- Extractable props: tabs (Tab[]), activeTabId (string), activeWorkspaceId (string)
- Hardcoded: Sidebar width, collapsible icons

## NewTabPage
- Source: `src/components/NewTabPage.tsx`
- Category: basic
- Description: Home dashboard with speed dials, clock, and search input
- Extractable props: speedDials (Array), theme (string), isIncognito (boolean)
- Hardcoded: Search engine formatters, background particle renderers

## SidePanel
- Source: `src/components/SidePanel.tsx`
- Category: layout
- Description: AI assistant slide-out panel with live tool status and attachments
- Extractable props: isOpen (boolean), onClose (function)
- Hardcoded: Markdown renderers, attachment limits, theme colors
