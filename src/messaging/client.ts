import {
  RequestSchema,
  ResponseSchema,
  type MessageRequest,
  type MessageResponse,
} from './protocol';

export async function sendRequest(request: MessageRequest): Promise<MessageResponse> {
  const validatedRequest = RequestSchema.parse(request);
  const response: unknown = await browser.runtime.sendMessage(validatedRequest);
  return ResponseSchema.parse(response);
}
