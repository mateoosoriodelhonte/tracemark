import { captureDocumentSelection } from '../domain/capture-selection';

export default defineContentScript({
  registration: 'runtime',
  main() {
    return captureDocumentSelection(document, window.getSelection());
  },
});
