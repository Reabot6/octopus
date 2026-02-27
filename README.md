# Octopus Math Tutor

Octopus is an AI-powered math tutor designed to provide personalized learning paths, problem-of-the-week challenges, and direct messaging between teachers and students. It breaks down complex problems into prerequisites, teaches fundamental concepts, and guides users through similar solutions, making math learning intuitive and engaging.

## Features

*   **Personalized Learning Paths:** AI-driven analysis of math problems to identify prerequisite concepts.
*   **Step-by-Step Solutions:** Detailed solutions for similar problems, linked to foundational concepts.
*   **Interactive Teaching:** Explanations of math concepts with real-world examples.
*   **Problem of the Week:** Engaging challenges to test and improve math skills.
*   **Teacher-Student Messaging:** Direct communication for support and guidance.
*   **Teacher Dashboard:** Overview of student progress and activity.

## Architecture

This application is built as a Single Page Application (SPA) with a serverless backend.

*   **Frontend:** React (Vite) with TypeScript and Tailwind CSS.
*   **Backend:** Vercel Serverless Functions (TypeScript) for API routes.
*   **AI Models:** Utilizes Groq for fast and efficient AI inference.

## Local Development

To set up Octopus Math Tutor on your local machine, follow these steps:

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn
*   Git

### 1. Clone the Repository

First, clone the project from GitHub to your local machine:

```bash
git clone https://github.com/your-username/octopus-math-tutor.git
cd octopus-math-tutor
```

### 2. Install Dependencies

Install the frontend and backend dependencies:

```bash
npm install
# or
yarn install
```

### 3. Environment Variables

Create a `.env` file in the root directory of the project and add your Groq API key:

```env
GROQ_API_KEY="your_groq_api_key_here"
JWT_SECRET="a_strong_secret_key_for_jwt"
```

*   **`GROQ_API_KEY`**: Obtain your API key from [Groq Console](https://console.groq.com/).
*   **`JWT_SECRET`**: A strong, random string used for signing JWTs. You can generate one using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

### 4. Run the Development Server

Start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be accessible at `http://localhost:5173` (or another port if 5173 is in use).

## Deployment to Vercel

This project is configured for seamless deployment to Vercel.

### 1. Connect to GitHub

Push your local repository to a new GitHub repository.

### 2. Import Project to Vercel

1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click "Add New..." -> "Project".
3.  Select your GitHub repository.
4.  Vercel will automatically detect the project settings from `vercel.json`.

### 3. Configure Environment Variables on Vercel

1.  In your Vercel project settings, navigate to "Environment Variables".
2.  Add `GROQ_API_KEY` and `JWT_SECRET` with their respective values.

### 4. Deploy

Once environment variables are set, Vercel will automatically deploy your project. Subsequent pushes to your connected GitHub branch will trigger automatic deployments.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open-source and available under the MIT License.
