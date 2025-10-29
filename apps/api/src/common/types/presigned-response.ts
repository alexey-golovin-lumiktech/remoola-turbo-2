export type IPresignedResponse = {
  url: string;
  fields?: Record<string, string>;
  fileUrl: string;
  method: `PUT` | `POST`;
};
