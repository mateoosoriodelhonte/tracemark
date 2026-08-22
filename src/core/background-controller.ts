export const CAPTURE_MENU_ID = 'tracemark-save-selection';

export interface ContextMenuEvent {
  menuItemId: string | number;
  frameId?: number;
}

export interface BrowserTabEvent {
  id?: number;
}

export interface BackgroundHandlerDependencies {
  createSelectionMenu(options: { id: string; title: string; contexts: ['selection'] }): void;
  saveTabSelection(tabId: number, frameId?: number): Promise<unknown>;
  routeMessage(message: unknown, sender: { id?: string }): Promise<unknown>;
}

export function createBackgroundHandlers(dependencies: BackgroundHandlerDependencies) {
  return {
    installed(): void {
      dependencies.createSelectionMenu({
        id: CAPTURE_MENU_ID,
        title: 'Save selection to TraceMark',
        contexts: ['selection'],
      });
    },

    async contextMenuClicked(info: ContextMenuEvent, tab: BrowserTabEvent): Promise<void> {
      if (info.menuItemId !== CAPTURE_MENU_ID || tab.id === undefined) return;
      await dependencies.saveTabSelection(tab.id, info.frameId);
    },

    async command(command: string, tab: BrowserTabEvent): Promise<void> {
      if (command !== 'save-selection' || tab.id === undefined) return;
      await dependencies.saveTabSelection(tab.id);
    },

    async message(message: unknown, sender: { id?: string }): Promise<unknown> {
      return dependencies.routeMessage(message, sender);
    },
  };
}
