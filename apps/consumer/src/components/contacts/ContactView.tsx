'use client';

import { useState } from 'react';

import { type ConsumerContact } from '../../types';

export default function ContactView({ contact }: { contact: ConsumerContact }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-semibold">{contact.name ?? contact.email}</h1>

      <div className="space-y-2">
        <div>
          <strong>Email:</strong> {contact.email}
        </div>
        <div>
          <strong>Address:</strong> {JSON.stringify(contact.address)}
        </div>
      </div>

      <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-md bg-blue-600 text-white">
        Edit
      </button>
    </div>
  );
}
