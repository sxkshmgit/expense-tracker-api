from datetime import datetime
from pydantic import EmailStr
from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    description: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    payment_method: str = Field(..., min_length=1)
    date: datetime
    user_id: str


class ExpenseResponse(ExpenseCreate):
    id: str
    user_id: str
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr


class UserResponse(UserCreate):
    id: str    