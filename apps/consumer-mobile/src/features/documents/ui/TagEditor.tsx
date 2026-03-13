'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showSuccessToast, showWarningToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { XIcon } from '../../../shared/ui/icons/XIcon';
import { Modal } from '../../../shared/ui/Modal';
import { updateDocumentTags } from '../actions';
import styles from './TagEditor.module.css';

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

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (tags.length >= 10) {
      showWarningToast(`Maximum 10 tags allowed`);
      return;
    }

    if (trimmed.length > 50) {
      showWarningToast(`Tag must be 50 characters or less`);
      return;
    }

    if (tags.includes(trimmed)) {
      showWarningToast(`Tag already exists`);
      return;
    }

    setTags([...tags, trimmed]);
    setInputValue(``);
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const result = await updateDocumentTags(docId, { tags });

    if (result.ok) {
      showSuccessToast(`Tags updated successfully`);
      startTransition(() => {
        router.refresh();
      });
      onClose();
    } else {
      clientLogger.error(`Failed to update document tags`, {
        docId,
        error: result.error,
      });
      showErrorToast(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.DOCUMENTS_UPDATE_TAGS_FAILED)),
        { code: result.error.code },
      );
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
        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose} disabled={isPending} className={styles.footerBtn}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isPending}
            disabled={isPending}
            className={styles.footerBtn}
          >
            Save
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <div>
          <label htmlFor="tag-input" className={styles.label}>
            Add Tag
          </label>
          <div className={styles.inputRow}>
            <input
              id="tag-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter tag name"
              className={styles.input}
              maxLength={50}
            />
            <Button onClick={handleAddTag} disabled={!inputValue.trim() || isPending} size="md">
              Add
            </Button>
          </div>
        </div>

        <div>
          <p className={styles.tagsLabel}>Tags ({tags.length}/10)</p>
          {tags.length === 0 ? (
            <p className={styles.emptyText}>No tags added yet</p>
          ) : (
            <div className={styles.tagsList}>
              {tags.map((tag, index) => (
                <span key={`${tag}-${index}`} className={styles.tag}>
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(index)}
                    disabled={isPending}
                    className={styles.tagRemoveBtn}
                    aria-label={`Remove ${tag}`}
                  >
                    <XIcon className={styles.tagRemoveIcon} />
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
