# Scam Shield Sentinel

Act as a senior full-stack developer. Build a complete, production-ready web application called "Faro-Detect" with the following specifications:



## Tech Stack

- **Frontend:** React with TypeScript, Tailwind CSS (use a dark theme with glass-morphism effects and a modern UI).

- **Backend:** FastAPI (Python).

- **Database:** SQLite (development) / PostgreSQL (production).

- **Authentication:** JWT-based authentication.



## Core Features



### 1. User Authentication

- **Registration:** Users can create an account with an email and password.

- **Login:** Users can log in with their credentials to receive a JWT token.

- **Protected Routes:** The dashboard and scan history must be accessible only to authenticated users.



### 2. Scam Detection Engine

- **Input:** A text area where users can paste a suspicious SMS message.

- **Analysis:** The system must analyze the message for scam indicators (e.g., OTP requests, urgency language, mentions of MTN/Orange Money, suspicious links, fake prize offers).

- **Output:** Display a clear result card showing:

  - **Risk Score:** A percentage (0-100%).

  - **Status:** "Safe," "Warning," or "Dangerous."

  - **Category:** The type of scam detected (e.g., "OTP Theft," "Phishing Link," "Fake Mobile Money Alert").

  - **Reason:** A detailed, human-readable explanation of why the message was flagged.

- **Confidence Level:** Show a confidence level for the detection.



### 3. Scan History

- **Storage:** Every scan must be saved to the database and associated with the logged-in user.

- **Display:** Users can view a list of their past scans, showing the message preview, status, and timestamp.

- **Persistence:** Scan history must persist across sessions.



### 4. Design & UX

- **Landing Page:** A professional landing page with a hero section, feature highlights, and calls to action.

- **Login/Register Pages:** Clean, minimal forms with glass-morphism styling.

- **Dashboard:** A user-friendly dashboard with the scan input, result display, and history section.

- **Responsive:** The app must be fully responsive and work well on mobile devices.



### 5. Deployment & Code Management

- **Push to GitHub:** Provide the complete codebase so I can push it to my GitHub repository.

- **Live Demo:** Ensure the app runs correctly and includes a live demo link.



## Additional Instructions

- Use environment variables for sensitive data (e.g., JWT secret, database URL).

- Include clear, well-commented code.

- Set up CORS to allow the frontend to communicate with the backend.

- Use SQLModel or SQLAlchemy for the database ORM.



## Sample Scam Messages for Testing

- "URGENT: Your MTN MoMo account has been suspended. Send OTP 123456 to reactivate immediately."

- "Congratulations! You've won 5,000,000 CFA. Click here to claim your prize: http://bit.ly/fake-link"

- "Your Orange Money account will be blocked. Verify your PIN now."



Build the entire application and provide the complete code, ready to run.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://scampat-guardian.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f7c78214-1cc0-4e3f-88be-0cdf1fd902b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
