#!/bin/bash
# ==============================================================================
# Nexus ERP Foundation Code Scaffolder
# ==============================================================================
# This script automates the setup of the project structure, dependencies,
# and configurations as per the Step 2 requirements.
#
# NOTE FOR WINDOWS USERS:
# Please run this script in a bash-compatible environment like Git Bash or WSL
# (Windows Subsystem for Linux) to ensure all commands execute correctly.
# ==============================================================================

# --- Stop on any error ---
set -e

echo "🚀 Starting Nexus ERP Foundation Setup..."

# --- 1. Directory and File Structure ---
echo "Step 1: Setting up monorepo folder structure..."

# Create the dedicated 'firebase' config directory
mkdir -p firebase
# Move existing firebase configs into the new directory
# Note: The '|| true' prevents the script from failing if a file doesn't exist
mv -f .firebaserc firebase/.firebaserc || true
mv -f firebase.json firebase/firebase.json || true
mv -f firestore.rules firebase/firestore.rules || true
mv -f firestore.indexes.json firebase/firestore.indexes.json || true

# Ensure the core app directories exist
mkdir -p apps/web/src
mkdir -p functions/src

# Create the component directory structure inside the web app
mkdir -p apps/web/src/components/Auth
mkdir -p apps/web/src/components/Navigation
mkdir -p apps/web/src/components/Dashboard
mkdir -p apps/web/src/components/DataLog
mkdir -p apps/web/src/components/Payroll
mkdir -p apps/web/src/components/AuditLog
mkdir -p apps/web/src/components/Settings
mkdir -p apps/web/src/components/Layout
mkdir -p apps/web/src/context
mkdir -p apps/web/src/hooks
mkdir -p apps/web/src/pages
mkdir -p apps/web/src/utils

echo "✅ Folder structure verified."


# --- 2. Root Configuration Files ---
echo "Step 2: Creating root configuration files..."

# Create .nvmrc to enforce Node.js version
echo "18" > .nvmrc
echo "✅ Created .nvmrc (Node >= 18)"

# Create a sample environment file
echo "GEMINI_API_KEY=YOUR_API_KEY_HERE" > .env.example
echo "✅ Created .env.example"

# Update root package.json to ensure it has workspaces enabled
# Using a temporary file to avoid JSON parsing issues in bash
cat > package.json.tmp << EOL
{
  "name": "nexus-erp-v2",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "workspaces": [
    "apps/*",
    "functions"
  ]
}
EOL
mv package.json.tmp package.json
echo "✅ Root package.json configured for workspaces."


# --- 3. Install Dependencies ---
echo "Step 3: Installing dependencies (Tailwind, React Router)..."
# Use the -w flag to target the 'web' workspace specifically
npm install -w web tailwindcss@latest postcss@latest autoprefixer@latest
npm install -w web react-router-dom@latest
npm install -w web @types/react-router-dom --save-dev

echo "✅ Frontend dependencies installed."


# --- 4. Initialize Tailwind CSS ---
echo "Step 4: Initializing and configuring Tailwind CSS..."

# Create Tailwind config files within the web app directory
npx tailwindcss init -p --full apps/web/tailwind.config.js

# Overwrite the generated tailwind.config.js with our specific configuration
cat > apps/web/tailwind.config.js << EOL
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1E3A8A', // Brand Color from prompt
        }
      }
    },
  },
  plugins: [],
}
EOL

# Create the main CSS file with Tailwind directives
cat > apps/web/src/index.css << EOL
@tailwind base;
@tailwind components;
@tailwind utilities;
EOL

echo "✅ Tailwind CSS configured with brand color #1E3A8A."

echo "🎉 Foundation setup complete! You can now run 'npm install' and then 'npm run dev -w web'."
