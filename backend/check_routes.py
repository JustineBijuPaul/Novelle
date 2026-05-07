from main import app
from fastapi.routing import APIRoute

for route in app.routes:
    if isinstance(route, APIRoute):
        print(f"Path: {route.path} | Name: {route.name} | Methods: {route.methods}")
    else:
        # For Mount objects (like static files or routers with prefixes)
        print(f"Path: {route.path} | Name: {getattr(route, 'name', 'None')}")
