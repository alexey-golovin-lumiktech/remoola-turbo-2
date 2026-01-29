/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';

import { type ConsumerContact } from '../../types';
import styles from '../ui/classNames.module.css';

const { contactViewButton, contactViewContainer, contactViewDetails, contactViewTitle } = styles;

type ContactViewProps = { contact: ConsumerContact };

export function ContactView({ contact }: ContactViewProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={contactViewContainer}>
      <h1 className={contactViewTitle}>{contact.name ?? contact.email}</h1>

      <div className={contactViewDetails}>
        <div>
          <strong>Email:</strong> {contact.email}
        </div>
        <div>
          <strong>Address:</strong> {JSON.stringify(contact.address)}
        </div>
      </div>

      <button
        onClick={(e) => (e.preventDefault(), e.stopPropagation(), setEditing(true))}
        className={contactViewButton}
      >
        Edit
      </button>
    </div>
  );
}
