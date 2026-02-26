import { isProfileCompleteFromTasks } from './profileCompleteFromTasks';

describe(`isProfileCompleteFromTasks`, () => {
  it(`returns true when profile task exists and completed`, () => {
    const tasks = [
      { id: `kyc`, label: `Complete KYC`, completed: true },
      { id: `profile`, label: `Complete your profile`, completed: true },
      { id: `w9`, label: `Upload W-9 form`, completed: false },
    ];
    expect(isProfileCompleteFromTasks(tasks)).toBe(true);
  });

  it(`returns false when profile task exists but not completed`, () => {
    const tasks = [
      { id: `kyc`, label: `Complete KYC`, completed: true },
      { id: `profile`, label: `Complete your profile`, completed: false },
      { id: `w9`, label: `Upload W-9 form`, completed: false },
    ];
    expect(isProfileCompleteFromTasks(tasks)).toBe(false);
  });

  it(`returns false when profile task is missing`, () => {
    const tasks = [
      { id: `kyc`, label: `Complete KYC`, completed: true },
      { id: `w9`, label: `Upload W-9 form`, completed: false },
    ];
    expect(isProfileCompleteFromTasks(tasks)).toBe(false);
  });

  it(`returns false for empty tasks`, () => {
    expect(isProfileCompleteFromTasks([])).toBe(false);
  });
});
