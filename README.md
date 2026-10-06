# Expense Tracker API

A RESTful expense-tracking API built with **FastAPI** and **MongoDB Atlas** using **PyMongo**. The project focuses on practical MongoDB application development: document modeling, references between collections, CRUD operations, advanced queries, pagination, sorting, indexing, and aggregation.

## Project Overview

The API manages:

- **Users** — create users with validated email addresses and enforce unique emails.
- **Expenses** — create, retrieve, update, and delete expenses linked to users.
- **Expense queries** — filter by category, amount, and user, combine conditions with MongoDB logical operators, sort results, and paginate them.
- **Expense analytics** — calculate overall and category-level spending summaries using MongoDB aggregation pipelines.

The project is intentionally focused on learning and demonstrating MongoDB with a FastAPI backend. Authentication and JWT-based authorization are not included in the current scope.

## Tech Stack

- Python
- FastAPI
- Pydantic
- PyMongo
- MongoDB Atlas
- Uvicorn
- python-dotenv

## Project Structure

```text
expense-tracker-api/
├── main.py
├── database.py
├── schemas.py
├── expenses.py
├── users.py
├── requirements.txt
├── .gitignore
└── .env                  # local only; not committed
```

### `main.py`

Creates the FastAPI application and registers the Users and Expenses routers.

### `database.py`

Loads the MongoDB connection string from the `.env` file, creates the PyMongo client, selects the `expense_tracker` database, and provides a small connection health check.

### `schemas.py`

Defines Pydantic models for request validation and API responses:

- `ExpenseCreate`
- `ExpenseResponse`
- `UserCreate`
- `UserResponse`

Expense data includes a `user_id` reference to the related user document.

### `users.py`

Contains the user API and creates a unique index on `email`.

### `expenses.py`

Contains the main expense API, MongoDB queries, reference validation, indexing, pagination, sorting, and aggregation endpoints.

## Database Design

The project uses two MongoDB collections:

### Users

Example document:

```json
{
  "_id": "ObjectId(...)",
  "name": "Saksham",
  "email": "saksham@example.com"
}
```

### Expenses

Example document:

```json
{
  "_id": "ObjectId(...)",
  "description": "Dinner",
  "amount": 625,
  "category": "Food",
  "payment_method": "UPI",
  "date": "2026-10-06T19:30:00",
  "user_id": "ObjectId(...)"
}
```

### User → Expense relationship

A user can have many expenses. Expenses store the user's MongoDB `ObjectId` as `user_id`.

When an expense is created or updated, the API:

1. Validates the supplied `user_id`.
2. Converts it from a string to MongoDB `ObjectId`.
3. Checks that the referenced user exists.
4. Stores the `ObjectId` in the expense document.

This demonstrates a MongoDB **referencing** approach rather than embedding all expenses inside the user document.

## MongoDB Concepts Demonstrated

### CRUD

The API implements:

- `POST /expenses`
- `GET /expenses`
- `GET /expenses/{expense_id}`
- `PUT /expenses/{expense_id}`
- `DELETE /expenses/{expense_id}`

User creation is available through:

- `POST /users`

### ObjectId Handling

MongoDB uses `ObjectId` values for document identifiers. The API converts incoming string IDs to `ObjectId` for database queries and converts ObjectIds back to strings before returning JSON responses.

Invalid IDs return a `400` response instead of causing a raw database error.

### Filtering

The expense list endpoint supports category and amount filters, including:

- exact matching with `$eq`
- not-equal matching with `$ne`
- greater-than and greater-than-or-equal comparisons with `$gt` and `$gte`
- less-than and less-than-or-equal comparisons with `$lt` and `$lte`
- multiple categories with `$in`
- excluded categories with `$nin`
- user-specific filtering through `user_id`

### Logical Queries

The API also demonstrates:

- `$or`
- `$and`

These allow multiple MongoDB conditions to be combined into more flexible queries.

### Sorting and Pagination

Expense results support:

- sorting by `amount` or `date`
- ascending or descending order
- page-based pagination with `page` and `limit`

Pagination uses the MongoDB `skip()` and `limit()` operations.

### Indexing

The project creates a compound index:

```text
category: 1
amount: -1
```

This demonstrates how indexes can improve queries that filter by category and sort by amount.

The project also uses a unique index on the users collection:

```text
email: 1 (unique)
```

This prevents duplicate user email addresses at the database level.

MongoDB's `explain()` was used during development to inspect query execution plans and verify index usage such as `IXSCAN`.

### Aggregation

The API uses MongoDB aggregation pipelines for expense analytics.

Overall summary:

`GET /expenses/summary`

Returns:

- total spending
- average expense
- highest expense
- lowest expense

Category summary:

`GET /expenses/summary/category`

Groups expenses by category and calculates:

- total spending
- average expense

The category summary is sorted by total spending in descending order.

MongoDB stages used include:

- `$group`
- `$sum`
- `$avg`
- `$max`
- `$min`
- `$project`
- `$sort`

## API Endpoints

### Users

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/users` | Create a user |

### Expenses

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/expenses` | Create an expense |
| GET | `/expenses` | List expenses with filtering, sorting, and pagination |
| GET | `/expenses/{expense_id}` | Get one expense |
| PUT | `/expenses/{expense_id}` | Replace an expense |
| DELETE | `/expenses/{expense_id}` | Delete an expense |
| GET | `/expenses/summary` | Get overall expense statistics |
| GET | `/expenses/summary/category` | Get category-level statistics |

## Example Requests

### Create a user

```json
POST /users

{
  "name": "Saksham",
  "email": "saksham@example.com"
}
```

### Create an expense

Use the returned user ID:

```json
POST /expenses

{
  "description": "Dinner",
  "amount": 625,
  "category": "Food",
  "payment_method": "UPI",
  "date": "2026-10-06T19:30:00",
  "user_id": "<USER_ID>"
}
```

### Filter by user

```text
GET /expenses?user_id=<USER_ID>
```

### Filter and sort

```text
GET /expenses?category=Food&min_amount=500&sort_by=amount&order=desc
```

### Pagination

```text
GET /expenses?page=2&limit=10
```

### Overall summary

```text
GET /expenses/summary
```

### Category summary

```text
GET /expenses/summary/category
```

## Validation and Error Handling

The API uses Pydantic validation for request data, including:

- required fields
- non-empty strings
- positive expense amounts
- valid email addresses

The API also handles important database/API errors such as:

- invalid MongoDB ObjectIds → `400`
- missing users referenced by an expense → `404`
- missing expenses → `404`
- duplicate user email → `409`

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/sxkshmgit/expense-tracker-api.git
cd expense-tracker-api
```

### 2. Create and activate a virtual environment

Windows Git Bash:

```bash
python -m venv .venv
source .venv/Scripts/activate
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure MongoDB Atlas

Create a MongoDB Atlas cluster and database user, then create a local `.env` file:

```env
MONGODB_URI=your_mongodb_connection_string
```

The `.env` file is ignored by Git and should never be committed.

### 5. Run the API

```bash
python -m uvicorn main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Interactive Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

## Development Notes

This project was built incrementally to learn MongoDB concepts through a working API rather than through isolated database examples.

The implementation covers the practical MongoDB topics most relevant to a small backend application while keeping the project intentionally focused. Authentication, JWTs, transactions, change streams, GridFS, sharding, and other advanced MongoDB/production features are outside the current scope.

## Learning Outcomes

By completing this project, the main MongoDB skills demonstrated are:

- connecting a FastAPI application to MongoDB Atlas with PyMongo
- designing collections and referenced relationships
- working with MongoDB ObjectIds
- performing CRUD operations
- building dynamic MongoDB query documents
- using comparison and logical query operators
- implementing pagination and sorting
- creating and reasoning about indexes
- inspecting query plans with `explain()`
- building aggregation pipelines
- validating and handling references between collections
- enforcing uniqueness through database indexes
