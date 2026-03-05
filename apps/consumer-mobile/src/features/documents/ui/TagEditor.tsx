'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { updateDocumentTags } from '../actions';

interface TagEditorProps {
  docId: string;
  initialTags?: string[];
  onClose: () => void;
}

/**
 * TagEditor - Mobile-friendly tag management modal
 * Add, remove, and edit tags with validation
 */
export function TagEditor({ docId, initialTags = [], onClose }: TagEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState(``);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (tags.length >= 10) {
      setError(`Maximum 10 tags allowed`);
      return;
    }

    if (trimmed.length > 50) {
      setError(`Tag must be 50 characters or less`);
      return;
    }

    if (tags.includes(trimmed)) {
      setError(`Tag already exists`);
      return;
    }

    setTags([...tags, trimmed]);
    setInputValue(``);
    setError(null);
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
    setError(null);
  };

  const handleSave = async () => {
    const result = await updateDocumentTags(docId, { tags });

    if (result.ok) {
      startTransition(() => {
        router.refresh();
      });
      onClose();
    } else {
      setError(result.error.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === `Enter`) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Tags"
      size="md"
      footer={
        <div
          className={`
            flex
            gap-3
          `}
        >
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className={`
              flex-1
            `}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isPending}
            disabled={isPending}
            className={`
              flex-1
            `}
          >
            Save
          </Button>
        </div>
      }
    >
      <div
        className={`
          space-y-4
        `}
      >
        <div>
          <label
            htmlFor="tag-input"
            className={`
              block
              text-sm
              font-medium
              text-slate-700
              dark:text-slate-300
            `}
          >
            Add Tag
          </label>
          <div
            className={`
              mt-1
              flex
              gap-2
            `}
          >
            <input
              id="tag-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter tag name"
              className={`
                min-h-[44px]
                flex-1
                rounded-lg
                border
                border-slate-300
                px-3
                py-2
                text-sm
                text-slate-900
                placeholder-slate-400
                focus:border-primary-500
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500
                dark:border-slate-600
                dark:bg-slate-700
                dark:text-white
                dark:placeholder-slate-500
              `}
              maxLength={50}
            />
            <Button onClick={handleAddTag} disabled={!inputValue.trim() || isPending} size="md">
              Add
            </Button>
          </div>
        </div>

        {error && (
          <div
            className={`
              rounded-lg
              border
              border-red-200
              bg-red-50
              px-3
              py-2
              text-sm
              text-red-800
              dark:border-red-900
              dark:bg-red-950
              dark:text-red-200
            `}
          >
            {error}
          </div>
        )}

        <div>
          <p
            className={`
              mb-2
              text-sm
              font-medium
              text-slate-700
              dark:text-slate-300
            `}
          >
            Tags ({tags.length}/10)
          </p>
          {tags.length === 0 ? (
            <p
              className={`
                text-sm
                text-slate-500
                dark:text-slate-400
              `}
            >
              No tags added yet
            </p>
          ) : (
            <div
              className={`
                flex
                flex-wrap
                gap-2
              `}
            >
              {tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className={`
                    inline-flex
                    items-center
                    gap-1
                    rounded-md
                    bg-primary-100
                    px-3
                    py-1.5
                    text-sm
                    font-medium
                    text-primary-700
                    dark:bg-primary-900
                    dark:text-primary-300
                  `}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(index)}
                    disabled={isPending}
                    className={`
                      ml-1
                      rounded-full
                      p-0.5
                      transition-colors
                      hover:bg-primary-200
                      focus:outline-none
                      focus:ring-2
                      focus:ring-primary-500
                      dark:hover:bg-primary-800
                    `}
                    aria-label={`Remove ${tag}`}
                  >
                    <svg
                      className={`
                        h-4
                        w-4
                      `}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
