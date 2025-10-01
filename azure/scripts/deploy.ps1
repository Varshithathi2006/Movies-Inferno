# Azure Deployment Script for Movie Inferno
# This PowerShell script deploys the entire Azure infrastructure

param(
    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "movies-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$true)]
    [string]$PostgresAdminPassword,
    
    [Parameter(Mandatory=$true)]
    [string]$YourIpAddress
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Azure deployment for Movie Inferno..." -ForegroundColor Green

# Login to Azure (if not already logged in)
try {
    $context = Get-AzContext
    if (-not $context) {
        Write-Host "Logging in to Azure..." -ForegroundColor Yellow
        Connect-AzAccount
    }
} catch {
    Write-Host "Logging in to Azure..." -ForegroundColor Yellow
    Connect-AzAccount
}

# Set subscription
Write-Host "Setting subscription to $SubscriptionId..." -ForegroundColor Yellow
Set-AzContext -SubscriptionId $SubscriptionId

# Create resource group
Write-Host "Creating resource group $ResourceGroupName in $Location..." -ForegroundColor Yellow
try {
    $rg = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
    if (-not $rg) {
        New-AzResourceGroup -Name $ResourceGroupName -Location $Location
        Write-Host "✅ Resource group created successfully" -ForegroundColor Green
    } else {
        Write-Host "✅ Resource group already exists" -ForegroundColor Green
    }
} catch {
    Write-Error "Failed to create resource group: $_"
    exit 1
}

# Deploy Bicep template
Write-Host "Deploying Azure infrastructure..." -ForegroundColor Yellow
$deploymentName = "movieinferno-deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

try {
    $deployment = New-AzResourceGroupDeployment `
        -ResourceGroupName $ResourceGroupName `
        -Name $deploymentName `
        -TemplateFile "azure/infrastructure/main.bicep" `
        -environment $Environment `
        -postgresAdminPassword (ConvertTo-SecureString $PostgresAdminPassword -AsPlainText -Force) `
        -yourIpAddress $YourIpAddress `
        -Verbose

    Write-Host "✅ Infrastructure deployment completed successfully!" -ForegroundColor Green
    
    # Display outputs
    Write-Host "`n📋 Deployment Outputs:" -ForegroundColor Cyan
    Write-Host "PostgreSQL Server: $($deployment.Outputs.postgresServerName.Value)" -ForegroundColor White
    Write-Host "Storage Account: $($deployment.Outputs.storageAccountName.Value)" -ForegroundColor White
    Write-Host "Key Vault: $($deployment.Outputs.keyVaultName.Value)" -ForegroundColor White
    Write-Host "Static Web App URL: https://$($deployment.Outputs.staticWebAppUrl.Value)" -ForegroundColor White
    Write-Host "App Insights: $($deployment.Outputs.appInsightsInstrumentationKey.Value)" -ForegroundColor White
    
    # Store secrets in Key Vault
    Write-Host "`n🔐 Storing secrets in Key Vault..." -ForegroundColor Yellow
    $keyVaultName = $deployment.Outputs.keyVaultName.Value
    
    # Get current user's object ID for Key Vault access
    $currentUser = Get-AzContext
    $userObjectId = (Get-AzADUser -UserPrincipalName $currentUser.Account.Id).Id
    
    # Set Key Vault access policy
    Set-AzKeyVaultAccessPolicy -VaultName $keyVaultName -ObjectId $userObjectId -PermissionsToSecrets Get,Set,Delete,List
    
    # Store connection strings and keys
    Set-AzKeyVaultSecret -VaultName $keyVaultName -Name "PostgresConnectionString" -SecretValue (ConvertTo-SecureString $deployment.Outputs.postgresConnectionString.Value -AsPlainText -Force)
    Set-AzKeyVaultSecret -VaultName $keyVaultName -Name "StorageConnectionString" -SecretValue (ConvertTo-SecureString $deployment.Outputs.storageConnectionString.Value -AsPlainText -Force)
    Set-AzKeyVaultSecret -VaultName $keyVaultName -Name "AppInsightsConnectionString" -SecretValue (ConvertTo-SecureString $deployment.Outputs.appInsightsConnectionString.Value -AsPlainText -Force)
    Set-AzKeyVaultSecret -VaultName $keyVaultName -Name "CognitiveServiceKey" -SecretValue (ConvertTo-SecureString $deployment.Outputs.cognitiveServiceKey.Value -AsPlainText -Force)
    
    Write-Host "✅ Secrets stored in Key Vault successfully!" -ForegroundColor Green
    
    # Create environment file
    Write-Host "`n📝 Creating environment configuration..." -ForegroundColor Yellow
    $envContent = @"
# Azure Environment Configuration for Movie Inferno
# Generated on $(Get-Date)

# Database
AZURE_POSTGRES_CONNECTION_STRING=$($deployment.Outputs.postgresConnectionString.Value)
AZURE_POSTGRES_SERVER=$($deployment.Outputs.postgresServerName.Value)

# Storage
AZURE_STORAGE_CONNECTION_STRING=$($deployment.Outputs.storageConnectionString.Value)
AZURE_STORAGE_ACCOUNT=$($deployment.Outputs.storageAccountName.Value)

# Key Vault
AZURE_KEY_VAULT_NAME=$($deployment.Outputs.keyVaultName.Value)
AZURE_KEY_VAULT_URI=$($deployment.Outputs.keyVaultUri.Value)

# Application Insights
AZURE_APP_INSIGHTS_CONNECTION_STRING=$($deployment.Outputs.appInsightsConnectionString.Value)
AZURE_APP_INSIGHTS_INSTRUMENTATION_KEY=$($deployment.Outputs.appInsightsInstrumentationKey.Value)

# Cognitive Services
AZURE_OPENAI_ENDPOINT=$($deployment.Outputs.cognitiveServiceEndpoint.Value)
AZURE_OPENAI_KEY=$($deployment.Outputs.cognitiveServiceKey.Value)

# Static Web App
AZURE_STATIC_WEB_APP_URL=https://$($deployment.Outputs.staticWebAppUrl.Value)

# Keep existing TMDB API key
NEXT_PUBLIC_TMDB_API_KEY=df540dc7eced57f912edf1ef5c88ebda
"@

    $envContent | Out-File -FilePath ".env.azure" -Encoding UTF8
    Write-Host "✅ Environment file created: .env.azure" -ForegroundColor Green
    
    Write-Host "`n🎉 Azure deployment completed successfully!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run the database migration script" -ForegroundColor White
    Write-Host "2. Configure your GitHub repository for Static Web Apps" -ForegroundColor White
    Write-Host "3. Update your application configuration" -ForegroundColor White
    
} catch {
    Write-Error "Deployment failed: $_"
    exit 1
}