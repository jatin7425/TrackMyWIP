# TrackMyWIP

TrackMyWIP is a lightweight, fast, and minimal Work-In-Progress (WIP) tracking tool designed for developers, freelancers, and students.
It focuses on one thing: making it extremely easy to record your daily work updates and view or share them later.

The application is live at:
**[https://www.trackmywip.in](https://www.trackmywip.in)**

---

## Overview

Most productivity tools are heavy, slow, or filled with unnecessary features.
TrackMyWIP keeps the workflow simple:

* Write what you worked on today
* Save it
* View and update entries whenever needed
* Share your WIPs with other users only when you choose to

No complex dashboards.
No tasks, projects, or clutter.
Just fast daily logging.

---

## Features

### Daily WIP Entry

Record your work for each day as a list of bullet points. The system groups entries by date automatically.

### Edit and Update Anytime

You can update any day’s entries without affecting others.

### View and Filter

Filter WIPs by year, month, or day.
Useful for reviews, documentation, or reporting.

### Share Access With Other Users

You can explicitly allow other users to view your WIPs.
This is ideal for teams, clients, or mentors.

### Clean and Fast Interface

The interface prioritizes speed and simplicity, making daily entry frictionless.

### Secure Authentication

User login handled through JWT cookies.
Each WIP is tied to its specific authenticated user.

---

## Tech Stack

**Frontend**
HTML
CSS
JavaScript
Vanilla JS for components

**Backend**
Vercel Serverless Functions (Node.js)
Protected routes with JWT-based session cookies

**Database**
MongoDB

---

## API Structure

The backend exposes routes through Vercel Functions.

Key endpoints include:

### `POST /api/wip`

Create or update the WIP entry for a specific date.

### `GET /api/wip`

Retrieve WIPs for the authenticated user or for another user (if access is granted).

### `PUT /api/wip`

Update the list of bullet points for a given date.

### `DELETE /api/wip`

Delete entries based on date filters.

### Access Control

Dedicated endpoints for managing who can view your WIPs.

---

## Deployment

TrackMyWIP is deployed on Vercel.
The live application is accessible at:

**[https://www.trackmywip.in](https://www.trackmywip.in)**

Backend functions are served through the same Vercel project.
MongoDB Atlas (or equivalent) is used for data storage.

---

## Local Development

1. Clone the repository
   `git clone https://github.com/<your-username>/TrackMyWIP.git`

2. Install dependencies
   `npm install`

3. Set environment variables:

   ```
   MONGODB_URI=<your MongoDB URI>
   JWT_SECRET=<your JWT secret>
   DB_NAME=wip_tracker
   ```

4. Run locally with Vercel CLI:

   ```
   vercel dev
   ```

5. Access at:
   `http://localhost:3000`

---

## Purpose of the Project

TrackMyWIP fills a very specific gap:

* You need to record what you worked on
* You don’t want a full project management tool
* You want to review your daily progress later
* You want to share it selectively with others
* You want something lightweight and functional

This tool exists to provide the simplest workflow possible.
