import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Messages } from "../Shared/messages";

type PageQuery = {
    token: string,
    pageSize: number,
    pageNumber: number
};

const httpTrigger: AzureFunction = async function (
    context: Context, req: HttpRequest
): Promise<void> {
    context.log(`Request Method: ${req.method}`);
    context.log(`Request Body: ${JSON.stringify(req.body)}`);

    const dto = !!req.body ?
        req.body as PageQuery :
        {
            token: req.query.token,
            pageSize: !!req.query.pageSize ? Number(req.query.pageSize) : 5,
            pageNumber: !!req.query.pageNumber ? Number(req.query.pageNumber) : 0
        } as PageQuery;

    if (isNaN(dto.pageSize) || isNaN(dto.pageNumber)) {
        context.res = {
            status: 400,
            body: "Invalid pageSize or pageNumber"
        };
        return;
    }

    try {
        const messages = await Messages.initialize(context);
      
        context.log("Finding messages...");
    
        const results = await messages.getMessages(dto.token, dto.pageSize, dto.pageNumber);
      
        context.log("Messages found.");

        context.log(JSON.stringify(results));
      
        context.res = {
          body: results
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