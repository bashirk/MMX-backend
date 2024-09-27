# MMX - Reusable Backend for Workspace Extensions

## Overview

This project is an open-source backend infrastructure usable for any Google Workspace  extension. The initial usage was designed for an extension that enhances email personalization capabilities beyond Gmail's native features. It includes a backend for user management, payment processing, and advanced personalization features.

## Features

- **User Management**: Utilizes Azure Cosmos DB for efficient and scalable user data management.
- **Payment Integration**: Seamless subscription management integrated with Paystack.
- **Credits-Based System**: Implements a flexible credits-based subscription model.

## Technical Stack

- **Backend**: Azure Functions (Node.js)
- **Database**: Azure Cosmos DB
- **Payment Processing**: Paystack API
- **Authentication**: Google OAuth
- **Frontend**: Your Google Apps Script

### Architecture

- **Azure Functions**: Serverless compute service that allows you to run event-triggered code without managing infrastructure.
- **Azure App Service**: Fully managed platform for building, deploying, and scaling web apps.

### Configuration

The backend requires several environment variables to be set in the Azure App Service:

- `COSMOS_DB_CONNECTION_STRING`: Connection string for Azure Cosmos DB
- `PAYSTACK_SECRET_KEY`: Secret key for Paystack API integration
- `GOOGLE_CLIENT_ID`: Client ID for Google OAuth
- `GOOGLE_CLIENT_SECRET`: Client secret for Google OAuth

Ensure these are properly set in your Azure App Service configuration.

## Setup

1. **Clone the Repository**
   ```
   git clone https://github.com/bashirk/MMX-backend.git
   cd MMX-backend
   ```

2. **Backend Setup**
    - Fork this repository
    - Set up an Azure account and create a Cosmos DB instance
    - In your Azure account, create an App Service
    - In your GitHub repository, go to *Settings* > *Secrets* and add the following secrets:
        - `AZURE_WEBAPP_PUBLISH_PROFILE`: The publish profile from your Azure App Service
    - Update the `.github/workflows/main_mailmergex.yml` file with your App Service name
    - Push changes to the `main` branch to trigger deployment

3. **Extension Setup**
   - Open your Google Apps Script project
   - Update the necessary configuration variables (backend URL, API keys, etc.)
   - Deploy your script

4. **Paystack Integration**
   - Sign up for a Paystack account
   - Update the Paystack API keys in the backend configuration

5. **Google OAuth**
   - Set up a Google Cloud Project
   - Configure OAuth consent screen
   - Generate necessary credentials

### Deployment

The backend is deployed using GitHub Actions. The workflow is defined in the `.github/workflows/main_mailmergex.yml` file. Here's a breakdown of the deployment process:

1. **Trigger**: The workflow is triggered on pushes to the `main` branch or manually through the GitHub UI.

2. **Build Job**:
   - Checks out the code
   - Sets up Node.js v18
   - Installs dependencies, builds the project, and runs tests
   - Zips the application for deployment

3. **Deploy Job**:
   - Downloads the built artifact
   - Unzips the package
   - Deploys to Azure Web App using the Azure WebApp Deploy action

## Contributing

We welcome contributions to this project! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Original concept and base code by Korede Bashir
- The GMail personalization script builds upon the work of Martin Hawksey's Mail Merge [script](https://github.com/mhawksey/solutions/blob/fa5f9296a71897812964f1fa5402473c6d2a9fc3/mail-merge/src/Code.js)

Project Link: [https://github.com/bashirk/MMX-backend.git](https://github.com/bashirk/MMX-backend)