import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { App, cert, deleteApp, initializeApp, ServiceAccount } from "firebase-admin/app";
import { getMessaging, Message } from "firebase-admin/messaging";
import { Registrations } from "../Shared/registrations";
import * as jsonKey from "../heybabe-firebase.secret.json";
const { FIREBASE_APP } = process.env;

type PushNotificationDto = {
  token: string;
  title: string;
  body: string;
};

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(`Request Method: ${req.method}`);
  context.log(`Request Body: ${JSON.stringify(req.body)}`);

  const dto = req.body as PushNotificationDto;

  let firebaseApp: App;
  try{
    firebaseApp = initializeApp({
      credential: cert(jsonKey as ServiceAccount)
    }, FIREBASE_APP);
  } catch(error) {
    context.log("Couldn't initialize firebase application.");
    context.log(error);

    context.res = {
      status: 400,
      body: JSON.stringify(error)
    }
  }

  try {

    context.log("Initializing the firebase app...");

    context.log("Firebase initialized.");

    const registrations = await Registrations.initialize(context);
  
    context.log("Finding device...");

    const destination = await registrations.findOtherDeviceName(dto.token);
  
    context.log(JSON.stringify(destination));

    const payload: Message = {
      token: destination.token,
      notification: {
        title: dto.title,
        body: dto.body,
      },
    };

    context.log("Sending message...")
  
    const response = await getMessaging(firebaseApp).send(payload);

    context.log(response);

    context.log("Destroying firebase app...");

    deleteApp(firebaseApp);
  
    context.res = {
      body: response
    };
  } catch(error) {
    context.log("Uh oh!");
    context.log(JSON.stringify(error));

    context.res = {
      status: 400,
      body: JSON.stringify(error)
    }
  }
};

export default httpTrigger;
