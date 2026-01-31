# OpenAI Realtime Console (Python)

This is a **Python (FastAPI)** powered fork of the original [OpenAI Realtime Console](https://github.com/openai/openai-realtime-console). It demonstrates how to use the [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) with [WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc), but replaces the Node.js/Express backend with a Python FastAPI server.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Fast Python package manager)
- [Node.js](https://nodejs.org/) (for building the frontend)
- An OpenAI API key

## Installation

1.  **Clone the repository** (if you haven't already).

2.  **Set up the Environment Variables**:
    Create a `.env` file in the root directory and add your OpenAI API key:

    ```bash
    OPENAI_API_KEY=your_api_key_here
    PORT=5001
    ```

3.  **Install Backend Dependencies**:
    This project uses `uv` for lightning-fast dependency management.

    ```bash
    uv sync
    ```

4.  **Install Frontend Dependencies**:
    ```bash
    npm install
    ```

## Usage

You can run the application in two ways:

### 1. Production Mode (Recommended)
This serves the optimized, built frontend from the Python server.

1.  **Build the Frontend**:
    ```bash
    npm run build
    ```

2.  **Run the Python Server**:
    ```bash
    uv run main.py
    ```

3.  **Open in Browser**:
    Navigate to [http://localhost:5001](http://localhost:5001).

### 2. Development Mode
This runs the Vite development server for the frontend (with hot reloading) and the Python server for the backend.

1.  **Run the Python Server** (in one terminal):
    ```bash
    uv run main.py
    ```

2.  **Run the Vite Dev Server** (in another terminal):
    ```bash
    npm run dev
    ```

3.  **Open in Browser**:
    Navigate to the URL shown by Vite (usually [http://localhost:5173](http://localhost:5173)).
    *Note: The vite config is set up to proxy `/token` and `/session` requests to the Python backend on port 5001.*

## Project Structure

- **`main.py`**: FastAPI backend server. Handles token generation using `OPENAI_API_KEY` and serves the static frontend files.
- **`client/`**: React frontend source code.
    - **`client/entry-client.jsx`**: Main React entry point.
- **`dist/`**: Compiled frontend assets (generated after `npm run build`).

## Changelog

### feat
- Implement Python FastAPI backend for OpenAI Realtime API interactions and static file serving.
- Implement tool definition and execution in backend side

### chore
- Move react-router-dom to devDependencies

### fix
- hydrateRoot to createRoot
- Fix stalled OpenAI responses by preventing duplicate tool executions in ToolPanel.jsx

## License

MIT
