from fastapi import APIRouter, HTTPException, status
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError

from database import db
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

collection = db["users"]

collection.create_index([("email", ASCENDING)], unique=True)


def serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate):
    data = user.model_dump()
    try:
        result = collection.insert_one(data)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already registered")
    data["_id"] = result.inserted_id
    return serialize(data)