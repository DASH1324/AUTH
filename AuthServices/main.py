from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

# routers
from routers import users
from routers import auth

app = FastAPI(title="Retail Auth Microservice")

# include routers
app.include_router(auth.router, prefix='/auth', tags=['auth'])
app.include_router(users.router, prefix='/users', tags=['users'])

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS setup to allow frontend and backend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # SUSUNTUKIN Q GOMALAW
        "http://192.168.100.14:4002", # ums frontend
        "http://localhost:4002",  # ums frontend
        "http://127.0.0.1:4002",  # ums frontend (added to fix loading issue)

        # IMS frontend and services
        "http://localhost:3000",  # ims frontend
        "http://192.168.100.14:3000",  # ims frontend (local network)
        "http://127.0.0.1:8001",  # ims products microservice
        "http://localhost:8001", 
        "http://127.0.0.1:8002",  # ims stock microservice
        "http://localhost:8002",  
        "http://127.0.0.1:8003",  # ims restock microservice
        "http://localhost:8003", 
        "http://127.0.0.1:8004",  # ims recipe microservice
        "http://localhost:8004", 
        "http://127.0.0.1:8005",  # ims waste microservice
        "http://localhost:8005", 
        "http://127.0.0.1:8006",  # ims blockchain
        "http://localhost:8006", 

        # OOS frontend and services
        "http://localhost:5000",  # oos frontend
        "http://192.168.100.14:5000",  # oos frontend (local network)
        "http://127.0.0.1:7001",  # oos delivery microservice
        "http://localhost:7001", 
        "http://127.0.0.1:7002",  # oos menu microservice
        "http://localhost:7002", 
        "http://127.0.0.1:7003",  # oos notification microservice
        "http://localhost:7003",  
        "http://127.0.0.1:7004",  # oos ordering microservice
        "http://localhost:7004", 
        "http://127.0.0.1:7005",  # oos payment microservice
        "http://localhost:7005", 
        "http://127.0.0.1:7006",  # oos user microservice
        "http://localhost:7006",       

        # POS frontend and services
        "http://localhost:4001",
        "http://192.168.100.10:4001",
        "http://localhost:9000",
        "http://127.0.0.1:9000", 
        "http://localhost:9001",
        "http://127.0.0.1:9001", 
        "http://localhost:9002",
        "http://127.0.0.1:9002",  
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# run app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", port=4000, host="127.0.0.1", reload=True)