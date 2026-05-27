import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock(`./core.server`, () => ({
  postAdminMutation: jest.fn(),
  patchAdminMutation: jest.fn(),
  deleteAdminMutation: jest.fn(),
}));

jest.mock(`./revalidation`, () => ({
  revalidateConsumerPaths: jest.fn(),
  revalidateConsumerDetailPaths: jest.fn(),
  revalidateDocumentsPaths: jest.fn(),
  revalidateDocumentAssignmentPaths: jest.fn(),
}));

const EMPTY_FORM = new FormData();

function formWith(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

async function loadConsumers() {
  return import(`./consumers.server`);
}

async function loadDocuments() {
  return import(`./documents.server`);
}

async function loadCore() {
  return import(`./core.server`) as Promise<{ postAdminMutation: jest.Mock }>;
}

describe(`admin-v2 form-action wrappers`, () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`createConsumerNoteFormAction`, () => {
    it(`returns inline error for empty content without calling upstream`, async () => {
      const { createConsumerNoteFormAction } = await loadConsumers();
      const { postAdminMutation } = await loadCore();

      const result = await createConsumerNoteFormAction(`consumer-1`, {}, EMPTY_FORM);

      expect(result).toEqual({ error: `content is required` });
      expect(postAdminMutation).not.toHaveBeenCalled();
    });

    it(`surfaces upstream failure as inline error`, async () => {
      const { createConsumerNoteFormAction } = await loadConsumers();
      const { postAdminMutation } = await loadCore();
      postAdminMutation.mockRejectedValueOnce(new Error(`Failed to create note`));

      const result = await createConsumerNoteFormAction(`consumer-1`, {}, formWith({ content: `note body` }));

      expect(result).toEqual({ error: `Failed to create note` });
    });

    it(`returns empty state on success`, async () => {
      const { createConsumerNoteFormAction } = await loadConsumers();
      const { postAdminMutation } = await loadCore();
      postAdminMutation.mockResolvedValueOnce(undefined);

      const result = await createConsumerNoteFormAction(`consumer-1`, {}, formWith({ content: `note body` }));

      expect(result).toEqual({});
      expect(postAdminMutation).toHaveBeenCalledTimes(1);
    });
  });

  describe(`addConsumerFlagFormAction`, () => {
    it(`returns inline error for empty flag`, async () => {
      const { addConsumerFlagFormAction } = await loadConsumers();
      const { postAdminMutation } = await loadCore();

      const result = await addConsumerFlagFormAction(`consumer-1`, {}, EMPTY_FORM);

      expect(result).toEqual({ error: `flag is required` });
      expect(postAdminMutation).not.toHaveBeenCalled();
    });

    it(`returns empty state on success`, async () => {
      const { addConsumerFlagFormAction } = await loadConsumers();
      const { postAdminMutation } = await loadCore();
      postAdminMutation.mockResolvedValueOnce(undefined);

      const result = await addConsumerFlagFormAction(`consumer-1`, {}, formWith({ flag: `needs_review` }));

      expect(result).toEqual({});
    });
  });

  describe(`createDocumentTagFormAction`, () => {
    it(`returns inline error for empty name`, async () => {
      const { createDocumentTagFormAction } = await loadDocuments();
      const { postAdminMutation } = await loadCore();

      const result = await createDocumentTagFormAction({}, EMPTY_FORM);

      expect(result).toEqual({ error: `Tag name is required` });
      expect(postAdminMutation).not.toHaveBeenCalled();
    });

    it(`returns empty state on success`, async () => {
      const { createDocumentTagFormAction } = await loadDocuments();
      const { postAdminMutation } = await loadCore();
      postAdminMutation.mockResolvedValueOnce(undefined);

      const result = await createDocumentTagFormAction({}, formWith({ name: `evidence` }));

      expect(result).toEqual({});
    });
  });
});
