import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock(`./core.server`, () => ({
  postAdminMutation: jest.fn(),
  patchAdminMutation: jest.fn(),
  deleteAdminMutation: jest.fn(),
}));

jest.mock(`./revalidation`, () => ({
  revalidateConsumerDetailPaths: jest.fn(),
  revalidateConsumerPaths: jest.fn(),
  revalidateDocumentsPaths: jest.fn(),
  revalidateDocumentAssignmentPaths: jest.fn(),
}));

const { postAdminMutation: mockedPostAdminMutation } = jest.requireMock(`./core.server`) as {
  postAdminMutation: jest.Mock;
};

describe(`admin-v2 mutation validation semantics`, () => {
  beforeEach(() => {
    mockedPostAdminMutation.mockReset();
  });

  it(`rejects empty consumer notes instead of silently no-oping`, async () => {
    const { createConsumerNoteAction } = await import(`./consumers.server`);

    await expect(createConsumerNoteAction(`consumer-1`, new FormData())).rejects.toThrow(`content is required`);
    expect(mockedPostAdminMutation).not.toHaveBeenCalled();
  });

  it(`rejects empty consumer flags instead of silently no-oping`, async () => {
    const { addConsumerFlagAction } = await import(`./consumers.server`);

    await expect(addConsumerFlagAction(`consumer-1`, new FormData())).rejects.toThrow(`flag is required`);
    expect(mockedPostAdminMutation).not.toHaveBeenCalled();
  });

  it(`rejects empty document tag names instead of silently no-oping`, async () => {
    const { createDocumentTagAction } = await import(`./documents.server`);

    await expect(createDocumentTagAction(new FormData())).rejects.toThrow(`Tag name is required`);
    expect(mockedPostAdminMutation).not.toHaveBeenCalled();
  });
});
