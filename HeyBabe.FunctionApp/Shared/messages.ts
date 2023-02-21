import { ListTableEntitiesOptions, odata, TableClient, TableEntity, TableEntityResult } from "@azure/data-tables";
import { Context } from "@azure/functions";
import { v4 as uuid } from 'uuid';
import { getDbClient } from "./db";
import { CreateMessage, Message } from "./message";
import { Registrations } from "./registrations";
const { MESSAGES_PARTITION } = process.env;

class Messages {
  private static shared: Messages;

  static async initialize(context: Context) {
    if (Messages.shared) {
      return Messages.shared;
    }

    const [ client, registrations ] = await Promise.all([
      getDbClient(),
      Registrations.initialize(context)
    ]);

    const notifications = new Messages(context, client, registrations);
    return Messages.shared = notifications;
  }

  private constructor(
    private context: Context,
    private client: TableClient,
    private registrations: Registrations
  ) {}
  
  async createMessage(message: CreateMessage) {
    const id = uuid();

    this.context.log("Retrieving source and destination devices...");

    const [ source, destination ] = await Promise.all([
      this.registrations.getDevice(message.token),
      this.registrations.getDestinationDevice(message.token)
    ]);

    this.context.log("Devices retrieved.");

    const entity: TableEntity<Message> = {
      partitionKey: MESSAGES_PARTITION,
      rowKey: id,
      id: id,
      to: destination.deviceName,
      from: source.deviceName,
      sentDate: new Date(),
      responseId: null,
      ...message
    };

    this.context.log("Creating entity...");
    const result = await this.client.createEntity(entity);
    this.context.log("Created entity.");

    return result;
  }

  async getMessages(deviceName: string, pageSize: number, pageNumber: number) {
    const options: ListTableEntitiesOptions = {
      queryOptions: {
        filter: odata`PartitionKey eq ${MESSAGES_PARTITION} and to eq ${deviceName}`
      }
    };

    this.context.log("Finding mesages...");
    const entities = await this.client.listEntities<Message>(options);

    this.context.log("Paginating entities...");

    const iterator = entities.byPage({
      maxPageSize: pageSize,
      
    });

    this.context.log("Reading entities...");

    let messages: Message[] = [];
    for await (const page of iterator) {
      this.context.log(page);
      if (pageNumber > 0) {
        pageNumber = pageNumber - 1;
        continue;
      }

      messages = page;
      break;
    }

    await Promise.all(messages);

    this.context.log("Read entities.");

    this.context.log(JSON.stringify(messages));

    return messages;
  }
}

export { Messages };