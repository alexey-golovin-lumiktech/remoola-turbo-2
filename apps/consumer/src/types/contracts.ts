export interface ConsumerContractItem {
  id: string;
  name: string;
  email: string;

  lastRequestId: string | null;
  lastStatus: string | null;

  lastActivity: string | Date | null;
  docs: number;
}
