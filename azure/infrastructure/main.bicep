// Azure Bicep template for Movie Inferno infrastructure
// This template creates all the Azure resources needed for the movie recommendation app

@description('The name of the resource group')
param resourceGroupName string = 'movies-rg'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param namePrefix string = 'movieinferno'

@description('Environment (dev, staging, prod)')
param environment string = 'dev'

@description('Administrator username for PostgreSQL')
param postgresAdminUsername string = 'movieadmin'

@description('Administrator password for PostgreSQL')
@secure()
param postgresAdminPassword string

@description('Your IP address for PostgreSQL firewall')
param yourIpAddress string

// Variables
var uniqueSuffix = substring(uniqueString(resourceGroup().id), 0, 6)
var postgresServerName = '${namePrefix}-postgres-${environment}-${uniqueSuffix}'
var storageAccountName = '${namePrefix}storage${environment}${uniqueSuffix}'
var keyVaultName = '${namePrefix}-kv-${environment}-${uniqueSuffix}'
var staticWebAppName = '${namePrefix}-webapp-${environment}-${uniqueSuffix}'
var cognitiveServiceName = '${namePrefix}-cognitive-${environment}-${uniqueSuffix}'
var appInsightsName = '${namePrefix}-insights-${environment}-${uniqueSuffix}'
var logAnalyticsName = '${namePrefix}-logs-${environment}-${uniqueSuffix}'

// PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B2s'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminUsername
    administratorLoginPassword: postgresAdminPassword
    version: '15'
    storage: {
      storageSizeGB: 128
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// PostgreSQL Database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: 'movieinferno'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.UTF8'
  }
}

// PostgreSQL Firewall Rules
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgresServer
  name: 'AllowYourIP'
  properties: {
    startIpAddress: yourIpAddress
    endIpAddress: yourIpAddress
  }
}

resource postgresFirewallRuleAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Storage Account for media assets
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// Blob containers for different media types
resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/media'
  properties: {
    publicAccess: 'Blob'
  }
}

resource postersContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/posters'
  properties: {
    publicAccess: 'Blob'
  }
}

resource profilesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/profiles'
  properties: {
    publicAccess: 'Blob'
  }
}

// Key Vault for secrets
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enableRbacAuthorization: true
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// Cognitive Services (for OpenAI)
resource cognitiveService 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: cognitiveServiceName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: cognitiveServiceName
    publicNetworkAccess: 'Enabled'
  }
}

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/yourusername/movie-inferno'
    branch: 'main'
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'out'
    }
  }
}

// Outputs
output postgresServerName string = postgresServer.name
output postgresConnectionString string = 'postgresql://${postgresAdminUsername}:${postgresAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/movieinferno?sslmode=require'
output storageAccountName string = storageAccount.name
output storageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output staticWebAppUrl string = staticWebApp.properties.defaultHostname
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output cognitiveServiceEndpoint string = cognitiveService.properties.endpoint
output cognitiveServiceKey string = cognitiveService.listKeys().key1