import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Registrations } from "../Shared/registrations";

type RegisterDto = {
  token: string;
  deviceName: string;
};

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(`Request Method: ${req.method}`);
  context.log(`Request Body: ${JSON.stringify(req.body)}`);

  const dto = req.body as RegisterDto;

  try {
    const registrations = await Registrations.initialize(context);
  
    context.log("Registering user...");

    const result = await registrations.register({ ...dto, registrationDate: new Date() });

    const registration = await registrations.findToken(dto.token);
    
    context.res = {
      // status: 200, /* Defaults to 200 */
      body: registration,
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
