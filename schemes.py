from datetime import datetime
from schemas import ExpenseCreate, ExpenseResponse
from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    description: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    payment_method: str = Field(..., min_length=1)
    date: datetime


class ExpenseResponse(ExpenseCreate):
    id: str