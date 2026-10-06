from fastapi import FastAPI
from expenses import router as expenses_router
from users import router as users_router
app = FastAPI(title="Expense Tracker API")
app.include_router(expenses_router)
app.include_router(users_router)