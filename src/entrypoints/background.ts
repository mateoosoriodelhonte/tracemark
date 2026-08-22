import { CollectionService } from '../core/collections';
import { createBackgroundHandlers, CAPTURE_MENU_ID } from '../core/background-controller';
import { CaptureService, createCaptureActions } from '../core/capture';
import { HighlightService } from '../core/highlights';
import { createMessageRouter } from '../messaging/router';
import { openTraceMarkDatabase } from '../storage/database';
import { ResearchRepository } from '../storage/repository';

async function createServices() {
  const database = await openTraceMarkDatabase();
  const repository = new ResearchRepository(database);
  const dependencies = {
    now: () => new Date().toISOString(),
    createId: () => crypto.randomUUID(),
  };
  const highlights = new HighlightService(repository, dependencies);
  const collections = new CollectionService(repository, dependencies);
  const capture = new CaptureService({
    executeScript: async ({ target, files }) => {
      const [file] = files;
      if (file !== '/content-scripts/capture.js') throw new Error('Capture script is invalid');
      return browser.scripting.executeScript({ target, files: ['/content-scripts/capture.js'] });
    },
    queryActiveTabs: async () => browser.tabs.query({ active: true, currentWindow: true }),
  });
  const captureActions = createCaptureActions(capture, highlights);
  const router = createMessageRouter({ capture, highlights, collections }, browser.runtime.id);

  return { captureActions, router };
}

function reportBackgroundError(error: unknown): void {
  console.error(
    'TraceMark background action failed',
    error instanceof Error ? error.name : 'UnknownError',
  );
}

export default defineBackground(() => {
  const services = createServices();
  const handlers = createBackgroundHandlers({
    createSelectionMenu(options) {
      void browser.contextMenus
        .remove(CAPTURE_MENU_ID)
        .catch(() => undefined)
        .then(() => browser.contextMenus.create(options))
        .catch(reportBackgroundError);
    },
    async saveTabSelection(tabId, frameId) {
      const { captureActions } = await services;
      return captureActions.saveTabSelection(tabId, frameId);
    },
    async routeMessage(message, sender) {
      const { router } = await services;
      return router(message, sender);
    },
  });

  browser.runtime.onInstalled.addListener(() => handlers.installed());
  browser.contextMenus.onClicked.addListener((info, tab) => {
    void handlers.contextMenuClicked(info, tab ?? {}).catch(reportBackgroundError);
  });
  browser.commands.onCommand.addListener((command, tab) => {
    void handlers.command(command, tab ?? {}).catch(reportBackgroundError);
  });
  browser.runtime.onMessage.addListener((message, sender) => handlers.message(message, sender));
});
