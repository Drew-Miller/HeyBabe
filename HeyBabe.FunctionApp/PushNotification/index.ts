import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { App, cert, deleteApp, getApp, initializeApp, ServiceAccount } from "firebase-admin/app";
import { getMessaging, Message } from "firebase-admin/messaging";
import { CreateMessage } from "../Shared/message";
import { Registrations } from "../Shared/registrations";
import { Messages } from "../Shared/messages";
import * as jsonKey from "../heybabe-firebase.secret.json";
const { FIREBASE_APP } = process.env;

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(`Request Method: ${req.method}`);
  context.log(`Request Body: ${JSON.stringify(req.body)}`);

  const dto = req.body as CreateMessage;

  let firebaseApp: App;
  try{
    context.log("Initializing the firebase app...");

    firebaseApp = initializeApp({
      credential: cert(jsonKey as ServiceAccount)
    }, FIREBASE_APP);

    context.log("Firebase initialized.");
  } catch(error) {
    context.log("Couldn't initialize firebase application.");
    context.log(error);

    context.log(`Getting ${FIREBASE_APP}  firebase app...`);
    firebaseApp = getApp();
    context.log(`${FIREBASE_APP} firebase app found.`);

    if (!firebaseApp) {
      context.res = {
        status: 400,
        body: JSON.stringify(error)
      }
      return;
    }
  }

  try {
    const [ registrations, messages ] = await Promise.all([
      Registrations.initialize(context),
      Messages.initialize(context)
    ]);
  
    context.log("Finding device...");

    const destination = await registrations.getDestinationDevice(dto.token);
  
    context.log(JSON.stringify(destination));

    const payload: Message = {
      token: destination.token,
      notification: {
        title: dto.title,
        body: dto.body,
      },
    };

    context.log("Sending message...")
  
    const [entity, firebaseResponse ] = await Promise.all([
      messages.createMessage(dto),
      getMessaging(firebaseApp).send(payload)
    ]);
    
    context.log(JSON.stringify(entity));
    context.log(firebaseResponse);

    context.log("Destroying firebase app...");

    deleteApp(firebaseApp);

    context.log("Firebase app destroyed.");
  
    context.res = {
      body: firebaseResponse
    };
  } catch(error) {
    context.log("Uh oh!");
    context.log(JSON.stringify(error));

    context.log("Deleting firebaseApp...");
    deleteApp(firebaseApp);
    context.log("Firebase App Deleted");

    context.res = {
      status: 400,
      body: JSON.stringify(error)
    }
  }
};

export default httpTrigger;
