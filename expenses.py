from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Response, status, Query
from typing import Literal
from database import db
from pymongo import ASCENDING, DESCENDING
from schemas import ExpenseCreate, ExpenseResponse

router = APIRouter(prefix="/expenses", tags=["Expenses"])

collection = db["expenses"]
collection.create_index([("category", ASCENDING), ("amount", DESCENDING)])


def to_object_id(expense_id: str) -> ObjectId:
    try:
        return ObjectId(expense_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid expense id")


def serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(expense: ExpenseCreate):
    data = expense.model_dump()
    result = collection.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize(data)


@router.get("", response_model=list[ExpenseResponse])
def get_expenses(
    category: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    sort_by: Literal["amount", "date"] = "date",
    order: Literal["asc", "desc"] = "desc",

):
    query = {}

    if category:
        query["category"] = category

    amount_filter = {}
    if min_amount is not None:
        amount_filter["$gte"] = min_amount
    if max_amount is not None:
        amount_filter["$lte"] = max_amount
    if amount_filter:
        query["amount"] = amount_filter

    skip = (page - 1) * limit
    direction = 1 if order == "asc" else -1

    cursor = collection.find(query).sort(sort_by, direction).skip(skip).limit(limit)
    return [serialize(doc) for doc in cursor]


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(expense_id: str):
    doc = collection.find_one({"_id": to_object_id(expense_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    return serialize(doc)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: str, expense: ExpenseCreate):
    oid = to_object_id(expense_id)
    result = collection.update_one({"_id": oid}, {"$set": expense.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return serialize(collection.find_one({"_id": oid}))


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str):
    result = collection.delete_one({"_id": to_object_id(expense_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)