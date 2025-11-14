/* eslint-disable max-len */
import { useState } from 'react';

import { useSignupContext, HOW_DID_HEAR_ABOUT_US, type IHowDidHearAboutUs } from './context/signup';

const OPTIONS = Object.values(HOW_DID_HEAR_ABOUT_US).map(String);

export function HeardAboutUsSection() {
  const {
    state: { signupDetails },
    action: { updateSignupDetails },
  } = useSignupContext();

  const [source, setSource] = useState<IHowDidHearAboutUs | string>(signupDetails.howDidHearAboutUs);
  const [explanation, setExplanation] = useState(``);

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSource(value);
    if (value !== HOW_DID_HEAR_ABOUT_US.OTHER) {
      setExplanation(``);
      updateSignupDetails(`howDidHearAboutUs`, source);
    } else {
      updateSignupDetails(`howDidHearAboutUs`, explanation);
    }
  };

  const handleExplanationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setExplanation(value);
    updateSignupDetails(`howDidHearAboutUs`, explanation);
  };

  return (
    <div className="flex flex-col w-full gap-3">
      <div className="flex flex-col">
        <label htmlFor="howDidHearAboutUs" className="text-sm font-medium text-blue-600 mb-1">
          How Did You Hear About Us?
        </label>
        <select
          id="howDidHearAboutUs"
          name="howDidHearAboutUs"
          value={source}
          onChange={handleSourceChange}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          {OPTIONS.map((opt) => (
            <option key={opt} value={opt === `Not Selected` ? `` : opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {source === HOW_DID_HEAR_ABOUT_US.OTHER && (
        <div className="flex flex-col">
          <label htmlFor="howDidHearAboutUsOther" className="text-sm font-medium text-blue-600 mb-1">
            Explain How Did You Hear About Us...
          </label>
          <input
            id="howDidHearAboutUsOther"
            name="howDidHearAboutUsOther"
            type="text"
            placeholder="Explain How Did You Hear About Us..."
            value={explanation}
            onChange={handleExplanationChange}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
}
