import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CreateRegistration } from "../Shared/registration";
import { Registrations } from "../Shared/registrations";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(`Request Method: ${req.method}`);
  context.log(`Request Body: ${JSON.stringify(req.body)}`);

  const dto = req.body as CreateRegistration;

  try {
    const registrations = await Registrations.initialize(context);
  
    context.log("Registering user...");

    const result = await registrations.register(dto);

    const registration = await registrations.getDevice(dto.token);
    
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
