import { DeviceName } from "./registration";

export type Message = {
  id: string;
  to: DeviceName;
  from: DeviceName;
  title: string;
  body: string;
  sentDate: Date,
  responseId?: string;
};

export type CreateMessage = {
  token: string;
  title: string;
  body: string;
}