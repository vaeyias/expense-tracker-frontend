---
timestamp: 'Mon Oct 20 2025 00:09:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_000922.cb66b029.md]]'
content_id: d0f5b2a85ac6c68450c7f0f15b2af11832400dc40b1a06a42539e8b6cf4f442a
---

# API Specification: User Concept

**Purpose:** To manage user accounts, including creation, editing, deletion, and retrieval of user information.

***

### POST /api/User/createUser

**Description:** Creates a new user account with a username and display name.

**Requirements:**

* The username must be unique.
* Username and display name are provided.

**Effects:**

* Creates a new user document in the `users` collection.

**Request Body:**

```json
{
  "username": "string",
  "displayName": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/editUser

**Description:** Edits the display name of an existing user.

**Requirements:**

* The user ID is provided.
* The new display name is provided.

**Effects:**

* Updates the `displayName` of the specified user.

**Request Body:**

```json
{
  "user": "ID",
  "newDisplayName": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/deleteUser

**Description:** Deletes a user account.

**Requirements:**

* The user ID is provided.

**Effects:**

* Removes the user document from the `users` collection.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/\_getUserById

**Description:** Retrieves the information for a specific user by their ID.

**Effects:**

* Returns the user document if found.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
{
  "userInfo": {
    "_id": "ID",
    "username": "string",
    "displayName": "string"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/\_getUserByUsername

**Description:** Retrieves user information by their username.

**Effects:**

* Returns the user document if found.

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "username": "string",
    "displayName": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

implement a login view
