import { TableClient, TableServiceClient } from "@azure/data-tables";
const { AZURE_TABLES_ENDPOINT, HEYBABE_TABLE } = process.env;

async function getDbClient() {
  if (!AZURE_TABLES_ENDPOINT || !HEYBABE_TABLE) {
    throw "Environment variables are undefined";
  }
  
  const tableService = TableServiceClient.fromConnectionString(AZURE_TABLES_ENDPOINT);
  await tableService.createTable(HEYBABE_TABLE);
  const tableClient = TableClient.fromConnectionString(AZURE_TABLES_ENDPOINT, HEYBABE_TABLE);
  return tableClient;
}

export { getDbClient };
