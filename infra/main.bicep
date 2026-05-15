// CIO Analytics PoC — infrastructure as code.
//
// Provisions the absolute minimum for the PoC:
//  - Resource group (created via azd outside this file)
//  - Storage account (LRS, blob versioning, soft-delete)
//  - Blob containers for prompts, articles, sources, users, and evaluations
//  - App Service plan (B1 Linux)
//  - App Service (Node 20) with system-assigned managed identity
//  - RBAC: Storage Blob Data Contributor for the app's managed identity
//  - Log Analytics workspace + Application Insights (for observability)
//
// Deliberately excluded from PoC: Foundry (provisioned manually in the
// Azure portal or via a separate Bicep — the API key is supplied as an
// app setting here), Entra ID app registration, private endpoints, VNet
// integration, autoscale, deployment slots.
//
// Run via `azd up` from the repo root.

@description('Environment name, used as a suffix for resource names. e.g. "poc".')
param environmentName string

@description('Azure region for all resources. Default: Sweden Central (same as Foundry).')
param location string = 'swedencentral'

@description('Name of the existing Foundry resource (without the .services.ai.azure.com suffix).')
param foundryResourceName string

@description('API key for the Foundry resource. Supplied as an app setting; in future moved to Key Vault + managed identity.')
@secure()
param foundryApiKey string

@description('HTTP Basic Auth password for the PoC. Single shared credential.')
@secure()
param pocPassword string

@description('Node runtime version for App Service.')
param nodeVersion string = '20-lts'

// --- Naming ---
var tags = {
  'azd-env-name': environmentName
  project: 'cio-analytics'
  environment: 'poc'
}
var uniqueSuffix = uniqueString(resourceGroup().id, environmentName)
var storageAccountName = toLower('cioa${uniqueSuffix}')
var appServicePlanName = 'plan-cioa-${environmentName}'
var appServiceName = 'app-cioa-${environmentName}-${uniqueSuffix}'
var logAnalyticsName = 'log-cioa-${environmentName}'
var appInsightsName = 'appi-cioa-${environmentName}'

// --- Storage ---
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    defaultToOAuthAuthentication: true
  }
}

resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    isVersioningEnabled: true
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
  }
}

resource promptsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'prompts'
  properties: {
    publicAccess: 'None'
  }
}

resource articlesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'articles'
  properties: {
    publicAccess: 'None'
  }
}

resource sourcesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'sources'
  properties: {
    publicAccess: 'None'
  }
}

resource usersContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'users'
  properties: {
    publicAccess: 'None'
  }
}

resource evaluationsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'evaluations'
  properties: {
    publicAccess: 'None'
  }
}

// --- Observability ---
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
  }
}

// --- App Service ---
// Note: B1 Linux is listed as available in Sweden Central but fails to
// provision for this subscription ("Requested features are not supported").
// P0v3 is the next step up and works in swedencentral — similar price,
// better perf, and streaming-friendly.
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: 'P0v3'
    tier: 'Premium0V3'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appServiceName
  location: location
  tags: union(tags, {
    'azd-service-name': 'web'
  })
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|${nodeVersion}'
      alwaysOn: true
      ftpsState: 'Disabled'
      http20Enabled: true
      minTlsVersion: '1.2'
      healthCheckPath: '/api/health'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: appInsights.properties.InstrumentationKey }
        // --- Foundry ---
        { name: 'FOUNDRY_RESOURCE', value: foundryResourceName }
        { name: 'FOUNDRY_API_KEY', value: foundryApiKey }
        { name: 'WRITER_MODEL', value: 'claude-sonnet-4-6' }
        { name: 'TRANSLATOR_MODEL', value: 'claude-haiku-4-5' }
        { name: 'REVIEWER_MODEL', value: 'claude-opus-4-6' }
        // --- Storage ---
        { name: 'STORAGE_MODE', value: 'azure' }
        { name: 'AZURE_STORAGE_ACCOUNT', value: storage.name }
        { name: 'AZURE_STORAGE_CONTAINER_PROMPTS', value: 'prompts' }
        { name: 'AZURE_STORAGE_CONTAINER_ARTICLES', value: 'articles' }
        { name: 'AZURE_STORAGE_CONTAINER_SOURCES', value: 'sources' }
        { name: 'AZURE_STORAGE_CONTAINER_USERS', value: 'users' }
        { name: 'AZURE_STORAGE_CONTAINER_EVALUATIONS', value: 'evaluations' }
        // --- Auth (PoC shared password) ---
        { name: 'POC_PASSWORD', value: pocPassword }
        // --- Logging ---
        { name: 'LOG_LEVEL', value: 'info' }
      ]
    }
  }
}

// --- RBAC: app service managed identity needs Blob Data Contributor ---
// This grants the managed identity permission to read/write the blobs,
// so that when we migrate from connection strings to DefaultAzureCredential
// (per §Migration), zero code changes outside of lib/foundry/auth.ts are needed.
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource appToStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, appService.id, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      storageBlobDataContributorRoleId
    )
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// --- Outputs ---
output webAppName string = appService.name
output webAppHostname string = appService.properties.defaultHostName
output webAppUrl string = 'https://${appService.properties.defaultHostName}'
output storageAccountName string = storage.name
output appInsightsName string = appInsights.name
