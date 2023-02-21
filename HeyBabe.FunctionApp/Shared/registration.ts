export type DeviceName = "Drew" | "Chloe";

export type Registration = {
    token: string;
    deviceName: DeviceName;
    registrationDate: Date;
};

export type CreateRegistration = {
    token: string;
    deviceName: DeviceName;
  };