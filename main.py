from datetime import datetime
import os
import json
import httpx
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Any, Optional
from fastapi import FastAPI, Request
from fastapi.middleware import Middleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from app.service import FUNCTION_DICT
from app.constants import TOOLS, INSTRUCTIONS

# Load environment variables
load_dotenv()

# Configure CORS
def make_middleware() -> list[Middleware]:
    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        ),
    ]
    return middleware

app = FastAPI(middleware=make_middleware())

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PORT = int(os.getenv("PORT", 5001))

# Session configuration matches server.js
session_config = {
    "session": {
        "type": "realtime",
        "model": "gpt-realtime-mini",
        "instructions": INSTRUCTIONS,
        "audio": {
            "output": {
                "voice": "marin",
            },
        },
        "tools": TOOLS,
        "tool_choice": "auto",
    },
}

@app.get("/token")
async def get_token():
    url = "https://api.openai.com/v1/realtime/client_secrets"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=session_config)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Token generation error: {e}")
            return JSONResponse(status_code=500, content={"error": "Failed to generate token"})

@app.post("/session")
async def post_session(request: Request):
    # Read the SDP from the request body
    body = await request.body()
    sdp = body.decode("utf-8")
    
    # Prepare the FormData-like structure for the upstream request
    # OpenAI expects "sdp" and "session" fields
    data = {
        "sdp": sdp,
        "session": json.dumps(session_config)
    }
    
    url = "https://api.openai.com/v1/realtime/calls"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # httpx handles x-www-form-urlencoded or multipart/form-data depending on how args are passed.
            # Passing 'data' usually sends form-encoded. server.js used FormData. 
            # Often server APIs accept both, but let's be careful. 
            # If server.js used `new FormData()`, it sends multipart/form-data.
            # To send multipart in httpx, use `files` dict (even for strings) or `data`?
            # Actually httpx `data` results in form-urlencoded. 
            # To force multipart, we might need to be explicit or use `files`.
            # However, for text fields, `data` is usually form-encoded.
            # Let's try standard form data first. If OpenAI strictly needs multipart, we use `files` for text fields too (weird hack) or `MultipartEncoder`.
            # But standard `data` with `post` handles simple fields. 
            # Wait, `form-data` in JS creates multipart by default? Yes.
            # So we should probably send multipart.
            
            # Using data=... sends application/x-www-form-urlencoded
            # Using files=... sends multipart/form-data
            # We can use `files` to send the text fields as parts.
            
            multipart_data = {
                "sdp": (None, sdp),
                "session": (None, json.dumps(session_config))
            }
            
            response = await client.post(url, headers=headers, files=multipart_data)
            
            # Return the SDP response text
            return PlainTextResponse(content=response.text, status_code=response.status_code)
        except Exception as e:
            print(f"Session error: {e}")
            return JSONResponse(status_code=500, content={"error": "Failed to create session"})


# Tool call schema
class ToolCallRequest(BaseModel):
    id: str
    name: str
    call_id: str
    arguments: Any

@app.post("/execute-tool")
async def execute_tool(request: ToolCallRequest):
    print(f"Executing tool: {request.name} with args: {request.arguments}")
    
    # Simple logic to handle different tools
    tool_function = FUNCTION_DICT.get(request.name)
    if tool_function:
        return {
            "status": "success",
            "message": f"Tool {request.name} executed successfully",
            "output": tool_function(**request.arguments)
        }
    
    return {
        "status": "unknown_tool",
        "message": f"No handler for tool: {request.name}"
    }

# Serve static files from the build directory
# Note: Users must run 'npm run build' to generate the 'dist' directory
dist_dir = os.path.join(os.getcwd(), "client", "dist", "client")

if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # API routes are prioritized, so this catch-all won't block them
        # if they are defined above.
        # But wait, specific routes need to be mathed first.
        # FastAPI matches in order. So put this LAST.
        # However, static files for assets are mounted above.
        
        # Check if the requested file exists (e.g. favicon.ico)
        requested_file = os.path.join(dist_dir, full_path)
        if os.path.isfile(requested_file):
            return FileResponse(requested_file)
            
        # Otherwise serve index.html for SPA routing
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    @app.get("/")
    async def root_warning():
        return JSONResponse({
            "message": "Frontend not found. Please run 'npm run build' to compile the frontend, or run 'npm run dev' to start the Vite development server."
        })

if __name__ == "__main__":
    print(f"Starting FastAPI server on port {PORT}...")
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT)
