import { anchorDocument } from '../domain/text-nodes';
import { AnchorCommandSchema, AnchorRuntimeResultSchema } from '../domain/schemas';

type RuntimeMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0];
type AnchorGlobal = typeof globalThis & {
  __tracemarkAnchorListener?: RuntimeMessageListener;
};

export default defineContentScript({
  registration: 'runtime',
  main() {
    const scope = globalThis as AnchorGlobal;
    if (scope.__tracemarkAnchorListener !== undefined) {
      browser.runtime.onMessage.removeListener(scope.__tracemarkAnchorListener);
    }

    const listener: RuntimeMessageListener = (message, sender) => {
      if (sender.id !== browser.runtime.id) return undefined;
      const command = AnchorCommandSchema.safeParse(message);
      if (!command.success) return undefined;

      browser.runtime.onMessage.removeListener(listener);
      delete scope.__tracemarkAnchorListener;
      return AnchorRuntimeResultSchema.parse(anchorDocument(document, command.data.selector));
    };

    scope.__tracemarkAnchorListener = listener;
    browser.runtime.onMessage.addListener(listener);
    return { status: 'ready' as const };
  },
});
