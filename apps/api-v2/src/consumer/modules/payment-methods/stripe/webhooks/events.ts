export const STRIPE_EVENT = {
  CHARGE_DISPUTE_CLOSED: `charge.dispute.closed`,
  CHARGE_DISPUTE_CREATED: `charge.dispute.created`,
  CHARGE_DISPUTE_UPDATED: `charge.dispute.updated`,
  CHARGE_REFUND_UPDATED: `charge.refund.updated`,
  CHARGE_REFUNDED: `charge.refunded`,
  CHECKOUT_SESSION_COMPLETED: `checkout.session.completed`,
  IDENTITY_VERIFICATION_SESSION_CANCELED: `identity.verification_session.canceled`,
  IDENTITY_VERIFICATION_SESSION_REDACTED: `identity.verification_session.redacted`,
  IDENTITY_VERIFICATION_SESSION_REQUIRES_INPUT: `identity.verification_session.requires_input`,
  IDENTITY_VERIFICATION_SESSION_VERIFIED: `identity.verification_session.verified`,
} as const;
