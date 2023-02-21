import { ListTableEntitiesOptions, odata, TableClient, TableEntity, TableEntityResult } from "@azure/data-tables";
import { Context } from "@azure/functions";
import { getDbClient } from "./db";
import { CreateRegistration, Registration } from "./registration";
const { REGISTRATIONS_PARTITION } = process.env;

class Registrations {
  private static shared: Registrations;

  static async initialize(context: Context) {
    if (Registrations.shared) {
      return Registrations.shared;
    }

    const tableClient = await getDbClient();
    const registrations = new Registrations(tableClient, context);
    return Registrations.shared = registrations;
  }

  private constructor(private client: TableClient, private context: Context) {}

  async upsertRegistration(registration: CreateRegistration) {
    const entity: TableEntity<Registration> = {
      partitionKey: REGISTRATIONS_PARTITION,
      rowKey: registration.deviceName,
      registrationDate: new Date(),
      ...registration
    };

    this.context.log("Upserting entity...");
    const result = await this.client.upsertEntity(entity, "Replace");
    this.context.log("Upserted entity.");

    return result;
  }

  async getRegistrations(): Promise<Registration[]> {
    let registrations: Registration[] = [];

    this.context.log("Listing entities...");
    const iterator = this.client.listEntities<Registration>();
    
    this.context.log("Reading entities...");
    for await (const entity of iterator) {
      this.context.log(entity);
      registrations.push(entity);
    }

    await Promise.all(registrations);
    
    this.context.log("Read entities.");
    return registrations;
  }

  register(registration: CreateRegistration) {
    return this.upsertRegistration(registration);
  }
  
  async getDevice(token: string): Promise<Registration> {
    const options: ListTableEntitiesOptions = {
      queryOptions: {
        filter: odata`PartitionKey eq ${REGISTRATIONS_PARTITION} and token eq ${token}`
      }
    }

    this.context.log("Finding token...");
    const iterator = await this.client.listEntities<Registration>(options);
    
    this.context.log("Reading entities...");

    const entities: TableEntityResult<Registration>[] = []
    for await (const entity of iterator) {
      entities.push(entity);
    }

    await Promise.all(entities);

    this.context.log("Read entities.");

    if (!entities || !entities.length) {
      throw `No device found with token ${token}`;
    }

    const registration = entities[0];

    this.context.log(JSON.stringify(registration));

    return registration;
  }

  async getDestinationDevice(token: string): Promise<Registration> {
    const options: ListTableEntitiesOptions = {
      queryOptions: {
        filter: odata`PartitionKey eq ${REGISTRATIONS_PARTITION} and token ne ${token}`
      }
    };

    this.context.log("Finding other device...");
    const iterator = await this.client.listEntities<Registration>(options);

    this.context.log("Reading entities...");

    const entities: TableEntityResult<Registration>[] = []
    for await (const entity of iterator) {
      this.context.log(JSON.stringify(entity));
      entities.push(entity);
    }

    await Promise.all(entities);

    this.context.log("Read entities.");

    this.context.log(JSON.stringify(entities));

    if (!entities || entities.length == 0) {
      throw `Could not find other device`;
    }

    const registration = entities[0];

    this.context.log(JSON.stringify(registration));

    return registration;
  }
}

export { Registrations }; 