import { describe, expect, it } from '@jest/globals';

import { helpGuideContentBySlug } from './guide-content';
import { HELP_GUIDE_SLUG } from './guide-registry';

describe(`guide content`, () => {
  it(`keeps verification help copy aligned to current dashboard and settings badge labels`, () => {
    const verificationGuide = helpGuideContentBySlug[HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS];
    const verificationArticleText = JSON.stringify(verificationGuide);

    expect(verificationArticleText).toContain(`More info required`);
    expect(verificationArticleText).toContain(`Not approved`);
    expect(verificationArticleText).toContain(`Review required`);
    expect(verificationArticleText).toContain(`In progress`);
    expect(verificationArticleText).toContain(`Needs retry`);
    expect(verificationArticleText).toContain(`Restart needed`);
    expect(verificationArticleText).not.toContain(`More information required`);
  });
});
