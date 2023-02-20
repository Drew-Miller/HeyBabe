import { ListTableEntitiesOptions, odata, TableClient, TableEntity, TableEntityResult } from "@azure/data-tables";
import { Context } from "@azure/functions";
import { getDbClient } from "./db";
import { Registration } from "./registration";
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

  async updateRegistration(registration: Registration) {
    const entity: TableEntity<Registration> = {
      partitionKey: REGISTRATIONS_PARTITION,
      rowKey: registration.deviceName,
      ...registration
    };

    this.context.log("Upserting entity...");
    const result = await this.client.upsertEntity(entity, "Replace");
    this.context.log("Upserted entity.");

    return result;
  }
  
  async createRegistration(registration: Registration) {
    const entity: TableEntity<Registration> = {
      partitionKey: REGISTRATIONS_PARTITION,
      rowKey: registration.deviceName,
      ...registration
    };

    this.context.log("Creating entity...");
    const result = await this.client.createEntity(entity);
    this.context.log("Created entity.");

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

  register(registration: Registration) {
    const existing = this.findDeviceName(registration.deviceName);
    if (existing) {
      return this.updateRegistration(registration);
    }

    return this.createRegistration(registration);
  }
  
  async findToken(token: string): Promise<Registration> {
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

    const registration = entities && entities.length > 0 ? entities[0] : undefined;

    this.context.log(JSON.stringify(registration));

    return registration;
  }

  async findDeviceName(deviceName: string): Promise<Registration> {
    const options: ListTableEntitiesOptions = {
      queryOptions: {
        filter: odata`PartitionKey eq ${REGISTRATIONS_PARTITION} and deviceName eq ${deviceName}`
      }
    }

    this.context.log("Finding device...");
    const iterator = await this.client.listEntities<Registration>(options);

    this.context.log("Reading entities...");

    const entities: TableEntityResult<Registration>[] = []
    for await (const entity of iterator) {
      entities.push(entity);
    }

    await Promise.all(entities);

    this.context.log("Read entities.");

    const registration = entities && entities.length > 0 ? entities[0] : undefined;

    this.context.log(JSON.stringify(registration));

    return registration;
  }

  async findOtherDeviceName(deviceName: string): Promise<Registration> {
    const options: ListTableEntitiesOptions = {
      queryOptions: {
        filter: odata`PartitionKey eq ${REGISTRATIONS_PARTITION} and deviceName ne ${deviceName}`
      }
    };

    this.context.log("Finding other device...");
    const iterator = await this.client.listEntities<Registration>(options);

    this.context.log("Reading entities...");

    const entities: TableEntityResult<Registration>[] = []
    for await (const entity of iterator) {
      entities.push(entity);
    }

    await Promise.all(entities);

    this.context.log("Read entities.");

    const registration = entities && entities.length > 0 ? entities[0] : undefined;

    this.context.log(JSON.stringify(registration));

    return registration;
  }

  async getDestination(token: string): Promise<Registration> {
    const source = await this.findToken(token);
    if (!source) {
      throw "Current device is not registered";
    }

    return this.findOtherDeviceName(source.deviceName);
  }
}

export { Registrations }; 