# Azure Deployment Guide for Movie Inferno

This guide provides comprehensive instructions for deploying the Movie Inferno application to Microsoft Azure using a complete set of Azure services.

## 🏗️ Architecture Overview

The Movie Inferno application is deployed using the following Azure services:

### Core Infrastructure
- **Azure Resource Group** (`movies-rg`) - Container for all resources
- **Azure Database for PostgreSQL Flexible Server** - Primary database
- **Azure Storage Account** - Blob storage for media assets
- **Azure Key Vault** - Secure storage for secrets and keys
- **Azure Static Web Apps** - Next.js application hosting

### Optional Services
- **Azure OpenAI Service** - Enhanced chatbot capabilities
- **Azure Application Insights** - Performance monitoring
- **Azure AD B2C** - Authentication and user management
- **Azure Monitor** - Logging and alerting

## 📋 Prerequisites

Before starting the deployment, ensure you have:

1. **Azure Account** with an active subscription
2. **Azure CLI** installed and configured
3. **PowerShell** (for Windows) or **Bash** (for Linux/macOS)
4. **Node.js 18+** installed
5. **Git** for version control
6. **TMDB API Key** from [The Movie Database](https://www.themoviedb.org/settings/api)

### Required Permissions

Your Azure account needs the following permissions:
- Contributor role on the subscription or resource group
- Key Vault Administrator (for Key Vault operations)
- Storage Blob Data Contributor (for blob operations)

## 🚀 Quick Start Deployment

### Step 1: Clone and Prepare

```bash
# Clone the repository
git clone <your-repo-url>
cd movie-inferno

# Install dependencies
npm install

# Copy environment template
cp azure/config/.env.azure.template .env.azure
```

### Step 2: Configure Environment Variables

Edit `.env.azure` with your specific values:

```bash
# Required - Update these values
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
AZURE_LOCATION=eastus
NEXT_PUBLIC_TMDB_API_KEY=your-tmdb-api-key

# Generated during deployment
AZURE_POSTGRESQL_ADMIN_PASSWORD=your-secure-password
AZURE_STORAGE_ACCOUNT_NAME=moviesstorageaccount
AZURE_KEY_VAULT_NAME=movies-keyvault
```

### Step 3: Run Deployment Script

```powershell
# Navigate to deployment scripts
cd azure/scripts

# Make script executable (Linux/macOS)
chmod +x deploy.ps1

# Run deployment
./deploy.ps1
```

The script will:
1. Create the Azure Resource Group
2. Deploy all infrastructure using Bicep templates
3. Configure the PostgreSQL database
4. Set up storage containers
5. Store secrets in Key Vault
6. Generate the final environment configuration

### Step 4: Deploy Application

```bash
# Build the application
npm run build

# Deploy to Azure Static Web Apps (if using GitHub Actions)
# The deployment will be triggered automatically on push to main branch

# Or deploy manually using Azure CLI
az staticwebapp create \
  --name movie-inferno-app \
  --resource-group movies-rg \
  --source https://github.com/your-username/movie-inferno \
  --location eastus \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location ".next"
```

## 📁 Project Structure

```
azure/
├── infrastructure/
│   ├── main.bicep              # Main Bicep template
│   ├── modules/                # Bicep modules
│   └── parameters/             # Parameter files
├── database/
│   ├── migrate-to-azure.sql    # Database schema migration
│   ├── functions-azure.sql     # PostgreSQL functions
│   ├── triggers-azure.sql      # Database triggers
│   └── rls-azure.sql          # Row Level Security policies
├── scripts/
│   ├── deploy.ps1              # Main deployment script
│   └── setup-database.ps1     # Database setup script
└── config/
    ├── azure-config.js         # Azure services configuration
    └── .env.azure.template     # Environment template
```

## 🔧 Manual Deployment Steps

If you prefer manual deployment or need to troubleshoot:

### 1. Create Resource Group

```bash
az group create \
  --name movies-rg \
  --location eastus
```

### 2. Deploy Infrastructure

```bash
az deployment group create \
  --resource-group movies-rg \
  --template-file azure/infrastructure/main.bicep \
  --parameters location=eastus projectName=movie-inferno
```

### 3. Configure Database

```bash
# Connect to PostgreSQL
psql "postgresql://movieadmin:password@movies-db-server.postgres.database.azure.com:5432/movies_db?sslmode=require"

# Run migration scripts
\i azure/database/migrate-to-azure.sql
\i azure/database/functions-azure.sql
\i azure/database/triggers-azure.sql
\i azure/database/rls-azure.sql
```

### 4. Set Up Storage Containers

```bash
# Create blob containers
az storage container create --name media --account-name moviesstorageaccount
az storage container create --name posters --account-name moviesstorageaccount
az storage container create --name profiles --account-name moviesstorageaccount
az storage container create --name stills --account-name moviesstorageaccount
az storage container create --name trailers --account-name moviesstorageaccount
```

### 5. Configure Key Vault Secrets

```bash
# Store database connection string
az keyvault secret set \
  --vault-name movies-keyvault \
  --name "postgresql-connection-string" \
  --value "postgresql://movieadmin:password@movies-db-server.postgres.database.azure.com:5432/movies_db?sslmode=require"

# Store TMDB API key
az keyvault secret set \
  --vault-name movies-keyvault \
  --name "tmdb-api-key" \
  --value "your-tmdb-api-key"
```

## 🔐 Security Configuration

### Azure AD B2C Setup

1. **Create B2C Tenant**:
   ```bash
   az ad b2c tenant create \
     --country-code US \
     --display-name "Movie Inferno" \
     --domain-name movieinferno
   ```

2. **Configure User Flows**:
   - Sign-up and sign-in policy
   - Password reset policy
   - Profile editing policy

3. **Register Application**:
   - Create app registration in B2C tenant
   - Configure redirect URIs
   - Set up API permissions

### Key Vault Access Policies

```bash
# Grant access to your application
az keyvault set-policy \
  --name movies-keyvault \
  --object-id <your-app-object-id> \
  --secret-permissions get list
```

## 📊 Monitoring and Logging

### Application Insights Setup

```bash
# Create Application Insights
az monitor app-insights component create \
  --app movies-app-insights \
  --location eastus \
  --resource-group movies-rg \
  --application-type web
```

### Health Check Endpoints

The application provides several health check endpoints:

- `/api/health` - Overall application health
- `/api/health/database` - Database connectivity
- `/api/health/azure` - Azure services status

## 🔄 CI/CD with GitHub Actions

The repository includes a comprehensive GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) that:

1. **Infrastructure Deployment** - Deploys Bicep templates
2. **Database Migration** - Runs SQL migration scripts
3. **Application Build** - Builds and tests the Next.js app
4. **Deployment** - Deploys to Azure Static Web Apps
5. **Health Checks** - Validates deployment success

### Required GitHub Secrets

Set up the following secrets in your GitHub repository:

```
AZURE_CREDENTIALS              # Service principal credentials
AZURE_SUBSCRIPTION_ID          # Azure subscription ID
POSTGRESQL_ADMIN_USERNAME      # Database admin username
POSTGRESQL_ADMIN_PASSWORD      # Database admin password
POSTGRESQL_SERVER_NAME         # PostgreSQL server name
STORAGE_ACCOUNT_NAME          # Storage account name
KEY_VAULT_NAME                # Key Vault name
AZURE_STATIC_WEB_APPS_API_TOKEN # Static Web Apps deployment token
TMDB_API_KEY                  # TMDB API key
NEXTAUTH_SECRET               # NextAuth.js secret
NEXTAUTH_URL                  # Application URL
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify firewall rules allow your IP
   - Check connection string format
   - Ensure SSL is enabled

2. **Storage Access Issues**:
   - Verify storage account key
   - Check container permissions
   - Validate SAS token generation

3. **Key Vault Access Denied**:
   - Check access policies
   - Verify service principal permissions
   - Ensure correct vault URL

4. **Application Deployment Failures**:
   - Check build logs
   - Verify environment variables
   - Review Static Web Apps configuration

### Debugging Commands

```bash
# Check resource group status
az group show --name movies-rg

# Test database connection
psql "postgresql://movieadmin:password@movies-db-server.postgres.database.azure.com:5432/movies_db?sslmode=require" -c "SELECT version();"

# List storage containers
az storage container list --account-name moviesstorageaccount

# Check Key Vault secrets
az keyvault secret list --vault-name movies-keyvault
```

## 💰 Cost Optimization

### Recommended Tiers for Production

- **PostgreSQL**: Burstable B1ms (1 vCore, 2GB RAM)
- **Storage Account**: Standard LRS
- **Key Vault**: Standard tier
- **Static Web Apps**: Standard plan
- **Application Insights**: Basic tier

### Cost-Saving Tips

1. Use Azure Reserved Instances for long-term deployments
2. Enable auto-pause for development databases
3. Set up budget alerts
4. Use Azure Cost Management for monitoring

## 📚 Additional Resources

- [Azure PostgreSQL Documentation](https://docs.microsoft.com/en-us/azure/postgresql/)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Azure AD B2C Documentation](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)

## 🆘 Support

For deployment issues or questions:

1. Check the troubleshooting section above
2. Review Azure service health status
3. Check application logs in Application Insights
4. Create an issue in the repository

---

**Note**: This deployment guide assumes you have the necessary Azure permissions and have configured your development environment properly. Always test deployments in a development environment before deploying to production.