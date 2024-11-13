# Speech Analysis with Generative AI and AWS Polly

This project uses Google Gemini, AssemblyAI, and AWS Polly to analyze speech and generate responses with synthesized audio. Follow the instructions below to set up and run the project.

## Requirements
- Node.js (version 16.x or higher)
- NPM (Node Package Manager)

## Setup Instructions

### Step 1: Clone the Repository
Clone this repository to your local machine.

```bash
git clone https://github.com/hoaphamduc/speaking-with-gemini.git
cd Speaking-with-Gemini
```

### Step 2: Install Dependencies
Run the following command to install required Node.js dependencies:

```bash
npm install
```

### Step 3: Configure Environment Variables
Create a .env file in the root directory and add the following API keys and environment variables.

Required API Keys and Credentials
Google Gemini API Key:

Get your API key from [Google Gemini API](https://ai.google.dev/gemini-api/docs).
Set it in .env as API_KEY.
AssemblyAI API Key:

Get your API key from [AssemblyAI](https://www.assemblyai.com/products/speech-to-text).
Set it in .env as ASSEMBLYAI_API_KEY.
AWS IAM Credentials:

Set up IAM credentials with access to Polly on AWS and get your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from the [AWS Console](https://aws.amazon.com/console/).
Define the AWS region where Polly is available, for example, us-west-2.
Port:

Specify the port (e.g., 443 for HTTPS).
Example .env file:

#### Google Gemini API Key
```sh
API_KEY=your_google_gemini_api_key
```

#### AssemblyAI API Key
```sh
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

#### AWS IAM credentials for Polly
```sh
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-west-2
```

#### Server Port
```sh
PORT=443
```

### Step 4: SSL Certificates
Ensure you have SSL certificates (privkey.pem and fullchain.pem) in an ssl directory at the root of your project to support HTTPS.

### Step 5: Run the Application
To start the application, use the following command:

```bash
npm run start
```

This will:

Install dependencies if not already installed.
Start the server on https://localhost:443 (or the port you specified in .env).

Alternative Commands

#### Development Mode (with auto-reload using nodemon):
```bash
npm run dev
```

#### Using PM2 for Production:
```bash
npm run pm2
```

#### Stop PM2:
```bash
npm run stoppm2
```

## Usage
Navigate to https://localhost:443 in your web browser. On the main page, you can upload an audio file to analyze, and the application will provide feedback based on the chosen topic.

## Author
Created by **hoaphamduc**.