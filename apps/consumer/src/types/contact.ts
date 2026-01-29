export type ConsumerContactAddress = {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
};

export type ConsumerContact = {
  id: string;
  email: string;
  name: string | null;
  address: ConsumerContactAddress;
};

export type ConsumerContactDetails = {
  id: string;
  email: string;
  name: string;
  address: ConsumerContactAddress;
  paymentRequests: ConsumerPaymentRequest[];
  documents: ConsumerDocument[];
};

export type ConsumerPaymentRequest = {
  id: string;
  amount: string;
  status: string;
  createdAt: Date;
};

export type ConsumerDocument = {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
};
