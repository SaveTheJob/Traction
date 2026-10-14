# SaveTheJob

SaveTheJob is a comprehensive job application tracking tool designed to streamline your job search process. It consists of two main components: a Chrome Extension for easily scraping job postings directly from popular job boards, and a React-based web dashboard for managing your application pipeline, network, and analytics.

## Features

### Chrome Extension
- **One-Click Job Scraping**: Automatically extract job titles, company names, and locations from job postings.
- **Supported Platforms**: Currently supports scraping from LinkedIn, Indeed, and Handshake.
- **Seamless Integration**: Saves scraped job details directly to your SaveTheJob account via Firebase.
- **Google Authentication**: Easy sign-in using your Google account.

### Web Dashboard
- **Application Pipeline**: Visualize and manage your job applications using a drag-and-drop Kanban board (powered by `@hello-pangea/dnd`).
- **Network Management**: Keep track of your professional contacts and interactions.
- **Analytics**: Gain insights into your job search progress with interactive charts (powered by `recharts`).
- **Secure Authentication**: User authentication and data storage handled securely by Firebase.

## Tech Stack

### Extension
- Manifest V3
- Chrome Extensions API (`activeTab`, `scripting`, `storage`, `identity`)
- Firebase (Auth, Firestore)

### Website
- **Frontend Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Backend/BaaS**: Firebase (Authentication, Firestore, Hosting)

## Project Structure

The project is organized as a monorepo with two main directories:

```
SaveTheJob/
├── Source Code/
│   ├── extension/      # Chrome Extension source code
│   └── website/        # React Web Dashboard source code
└── README.md
```

## Getting Started

### Prerequisites
- Node.js installed on your machine.
- A Firebase project set up with Authentication (Google & Email/Password) and Firestore enabled.

### Setting up the Web Dashboard

1. Navigate to the website directory:
   ```bash
   cd "Source Code/website"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Setting up the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `Source Code/extension` directory.
4. The SaveTheJob extension should now appear in your browser toolbar.

## Deployment

The web dashboard is configured to be deployed using Firebase Hosting.

1. Ensure you have the Firebase CLI installed: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Build the website: `cd "Source Code/website" && npm run build`
4. Deploy the site from `Source Code/website`: `firebase deploy --only hosting`
5. Deploy the Firestore security rules and indexes from the repo root: `firebase deploy --only firestore`

The Firebase web config is public by design, so `firestore.rules` is what protects user data.
Admins are listed by Firebase Auth UID in `firestore.rules` (`isAdmin`) and in `VITE_ADMIN_UIDS`
in `Source Code/website/.env.local`; keep the two in sync.
