<<<<<<< HEAD
# Ticket Management System

A small full-stack ticket management application built for the Full Stack Developer take-home assignment.

The application follows the flow from the provided wireframe:

**Client → Department POC → Technician → Department POC / Client**

A client can create a ticket for an issue, the concerned department can assign a technician or change the department, and the technician can submit an assessment. The complete history of the ticket is also shown through an activity log.

---

# Screenshots

I have added these sections so screenshots of the application can be added directly to the README.

## 1. Client Dashboard

<!-- PASTE SCREENSHOT HERE -->

![Client Dashboard](screenshots/client-dashboard.png)

---

## 2. Create New Ticket

<!-- PASTE SCREENSHOT HERE -->

![Create Ticket](screenshots/create-ticket.png)

---

## 3. Ticket Details

<!-- PASTE SCREENSHOT HERE -->

![Ticket Details](screenshots/ticket-details.png)

---

## 4. Department POC — Assign Technician

<!-- PASTE SCREENSHOT HERE -->

![Assign Technician](screenshots/assign-technician.png)

---

## 5. Technician Assessment

<!-- PASTE SCREENSHOT HERE -->

![Technician Assessment](screenshots/technician-assessment.png)

---

## 6. Activity / Audit Trail

<!-- PASTE SCREENSHOT HERE -->

![Activity Log](screenshots/activity-log.png)

---

## 7. Mobile View

<!-- PASTE SCREENSHOT HERE -->

![Mobile View](screenshots/mobile-view.png)

---

# Tech Stack

### Frontend

- React.js
- Vite
- Material UI (MUI)
- JavaScript

### Backend

- Python
- Django
- Django REST Framework

### Database

- PostgreSQL

SQLite can also be used for local development if PostgreSQL is not configured.

### Testing

- Django REST Framework tests
- Vitest
- React Testing Library

---

# 1. Prerequisites

Make sure the following are installed before running the project:

- Python 3.11+
- Node.js 18+
- npm
- PostgreSQL 14+ _(optional if using SQLite)_

You can check the installed versions using:

```bash
python --version
node --version
npm --version
psql --version
```

---

# 2. Backend Setup

Open a terminal and go to the backend folder:

```bash
cd backend
```

## Create a virtual environment

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

---

## Database Setup

The project can be run with PostgreSQL or SQLite.

### Using PostgreSQL

Create a PostgreSQL database and configure the values in `.env`.

First copy the example environment file:

```bash
cp .env.example .env
```

On Windows, you can also create the `.env` file manually from `.env.example`.

Add your PostgreSQL configuration to `.env`.

Example:

```env
DB_NAME=ticketing
DB_USER=ticketing_user
DB_PASSWORD=ticketing_password
DB_HOST=localhost
DB_PORT=5432
```

### Using SQLite

If PostgreSQL is not configured, the project can use SQLite for local development.

---

## Run database migrations

```bash
python manage.py migrate
```

---

## Add sample data

The project includes a seed command which creates sample departments, offices, users, issues and tickets.

```bash
python manage.py seed_data --tickets 28
```

You can change `28` to another number if required.

For example:

```bash
python manage.py seed_data --tickets 50
```

The sample data is useful for testing pagination and the different ticket states without having to create everything manually.

---

## Start the backend

```bash
python manage.py runserver 8000
```

The API will be available at:

```text
http://127.0.0.1:8000/api/
```

Django admin is available at:

```text
http://127.0.0.1:8000/admin/
```

If you want to use Django admin, create a superuser:

```bash
python manage.py createsuperuser
```

---

# 3. Backend Tests

From the `backend` directory:

```bash
python manage.py test tickets -v 2
```

The tests cover important parts of the ticket workflow, including:

- Ticket creation validation
- Multi-floor office validation
- Successful ticket creation
- Automatic department routing
- Assigning a technician
- Ticket status changes
- Audit event creation
- Preventing non-technicians from being assigned
- Making sure only the assigned technician can submit an assessment

---

# 4. Frontend Setup

Open another terminal and go to the frontend folder:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Create the environment file from `.env.example`.

The default API URL is:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Start the frontend:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

---

# 5. Frontend Tests

Run:

```bash
npm run test
```

The frontend tests currently cover:

- `StatusChip` rendering
- Ticket creation form validation
- Preventing submission when no issue is selected
- Displaying validation errors
- Quick Issue selection and form submission

---

# 6. How the User Roles Work

Authentication was not required for this assignment, so I did not add a login system.

Instead, the application has a **"Viewing as"** dropdown in the top-right corner.

It allows the flow to be tested as:

- Client
- Department POC
- Technician

Each request contains the selected user's role and ID, and the backend uses that information to apply the appropriate scope and permissions.

For example:

- A Client can create and view their tickets.
- A Department POC works with tickets belonging to their department.
- A Department POC can assign a technician or change the department.
- A Technician can submit an assessment only when they are assigned to that ticket.

This keeps the project focused on the actual ticket workflow without spending the assignment time on a complete authentication system.

---

# 7. Main Ticket Flow

The basic flow of the application is:

```text
Client creates ticket
        ↓
Ticket is routed to a department
        ↓
Department POC assigns technician
        ↓
Technician checks the issue
        ↓
Technician submits assessment
        ↓
Department POC reviews the result
        ↓
Client can mark the ticket as resolved
```

A ticket can also be rerouted to another department when required.

---

# 8. API Endpoints

Method Endpoint Purpose  
 GET `/api/tickets/?tab=open\|closed&role=&user_id=&search=&page=` | Get paginated tickets  
 POST `/api/tickets/` Create a ticket  
 GET `/api/tickets/{id}/` Get ticket details and activity
POST `/api/tickets/{id}/assign_worker/` Assign a technician  
 POST `/api/tickets/{id}/change_department/` Change the department  
 POST `/api/tickets/{id}/submit_assessment/` Submit technician assessment  
 POST `/api/tickets/{id}/mark_resolved/` Mark a ticket as resolved  
 GET/POST `/api/tickets/{id}/comments/` Read or add comments  
 GET `/api/departments/` Get departments  
 GET `/api/offices/` Get offices  
 GET `/api/floors/?office=` Get floors for an office  
 GET `/api/issues/?search=` Search issues  
 GET `/api/users/?role=&department=` Get users

---

# 9. Database Design

The main models used in the application are:

```text
Department
    │
    └── Users

Office
    │
    └── Floors

Issue
    │
    └── Default Department

Ticket
    ├── Office
    ├── Floors
    ├── Issues
    ├── Created By
    ├── Current Department
    ├── Assigned Technician
    └── Ticket Events
```

### Ticket and Floor

A ticket can be related to multiple floors, so `Ticket` and `Floor` have a many-to-many relationship.

For example:

```text
Ticket #10
    ├── 2nd Floor
    └── 3rd Floor
```

### Ticket Events

Every important action on a ticket is stored as a `TicketEvent`.

Examples include:

```text
Ticket created
Department assigned
Technician assigned
Department changed
Assessment submitted
Comment added
Ticket resolved
```

Each event contains information such as the actor, action, previous value, new value and timestamp.

The frontend uses these events to display the ticket's activity history.

---

# 10. Ticket Status Flow

The ticket status represents where the ticket currently is in the workflow.

The main states are:

```text
Pending Department Assignment
          ↓
Pending Technician Assignment
          ↓
Pending Technician Assessment
          ↓
Pending Department POC Review
          ↓
Resolved - Full / Partial
```

The exact transition depends on the action performed by the Client, Department POC or Technician.

---

# 11. Sample Data

The following command creates sample data:

```bash
python manage.py seed_data --tickets 28
```

It creates:

- 3 departments
  - Facilities
  - IT
  - Housekeeping

- 2 offices
- Multiple floors
- 8 issues
- 4 quick issues
- 3 clients
- 3 Department POCs
- 3 technicians
- 28 sample tickets

The tickets are spread across different statuses so that the list, pagination and different role actions can be tested immediately.

---

# 12. Validation

Validation is handled on both the frontend and backend.

Some of the important rules are:

- An issue must be selected while creating a ticket.
- A multi-floor office requires at least one floor.
- A ticket cannot contain more than the allowed number of floors.
- A Department POC can assign a technician from their department.
- Only a technician can submit a technician assessment.
- Only the technician currently assigned to the ticket can submit that assessment.

The backend also validates these rules instead of relying only on frontend validation.

---

# 13. Pagination

The ticket list uses API-based pagination.

For example:

```text
/api/tickets/?tab=open&page=1
/api/tickets/?tab=open&page=2
```

The seed command creates enough tickets to make multiple pages available.

This also makes it easier to test the pagination behavior during evaluation.

---

# 14. Assumptions

A few things were not completely specified in the wireframe, so I made the following assumptions:

### No authentication

Authentication was not required, so the `Viewing as` dropdown is used to simulate the current user.

### Automatic department routing

When a ticket is created, an issue can have a default department.

If an issue has a default department, the ticket is automatically routed there and an event is added to the activity log.

If there is no mapped department, the ticket remains pending department assignment.

### Technician assignment

A Department POC can assign technicians belonging to their own department.

### Creating tickets

Only Client users can create new tickets.

### Marking a ticket resolved

After the technician submits an assessment and the ticket reaches Department POC review, the client can mark the ticket as resolved.

### Technician suggestions

If a technician suggests changing the department or worker, the ticket goes to Department POC review.

The POC can then decide what action to take.

---

# 15. Known Limitations

This project was built within the assignment timebox, so some production-level features are not included.

### Authentication

There is no real login or authentication system.

The current implementation uses the selected demo user to simulate the current user.

A production application would use proper authentication and server-side permissions.

### Assessment model

The technician's assessment result is currently represented through a `TicketEvent`.

A separate `Assessment` model would make this easier to query and report on in a larger application.

### Attachments

Tickets and comments do not currently support file or image attachments.

### Filters and sorting

Search and ticket tab filtering are implemented.

The filter/sort controls shown in the wireframe are not fully connected to backend filtering.

### Optimistic updates

After an action, the frontend refreshes the ticket data from the API instead of updating the UI optimistically.

This is simple and works well for the current size of the application.

### Code splitting

The frontend is currently delivered as a single bundle.

For a production application, larger parts of the application could be lazy-loaded.

---

# 16. Project Structure

```text
facility-ticketing/
│
├── backend/
│   ├── config/
│   ├── tickets/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── tests.py
│   │   └── ...
│   │
│   ├── seed_data.py
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── ...
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── screenshots/
│   ├── client-dashboard.png
│   ├── create-ticket.png
│   ├── ticket-details.png
│   ├── assign-technician.png
│   ├── technician-assessment.png
│   ├── activity-log.png
│   └── mobile-view.png
│
└── README.md
```

---

# 17. AI Assistance

AI tools were used during development as a pair-programming and development assistant.

I used AI mainly for:

- Breaking down the assignment requirements
- Thinking through the database relationships
- Structuring the Django REST APIs
- Getting help with React/MUI implementation
- Reviewing and debugging parts of the implementation
- Writing and checking some tests

The code was reviewed and tested during development, and I am prepared to explain and modify the implementation if required.

---

# 18. Time Spent

Approximately **9 hours**, as specified by the assignment timebox.

Approximate breakdown:

```text
Backend — 3 hours
Frontend — 4 hours
Wireframe review + planning — 1 hour
Testing + README + final polish — 1 hour
```

---

# 19. Running the Complete Application

You need two terminals.

### Terminal 1 — Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt

python manage.py migrate

python manage.py seed_data --tickets 28

python manage.py runserver 8000
```

### Terminal 2 — Frontend

```bash
cd frontend

npm install

npm run dev
```

Then open:

```text
http://localhost:5173
```

From there, use the **Viewing as** dropdown to test the Client, Department POC and Technician flows.

---

# Final Checklist

Before submitting the project, I would check the following:

- PostgreSQL connection works
- Database migrations run successfully
- Sample data is created
- Backend starts without errors
- Frontend starts without errors
- Client can create a ticket
- Department POC can assign a technician
- Department POC can change the department
- Technician can submit an assessment
- Activity history is updated
- Client can mark the ticket resolved
- Pagination works
- Backend tests pass
- Frontend tests pass
- Screenshots have been added to the README
- `.env` is not committed
- `node_modules` and Python virtual environment are not committed
=======
# TicketManagementSystem
A Ultimate Platform for Organization to manage the ticket and handling the ticket. It reduce the pain points  to managing the tickets that are submitted by users , view by admin and the person who is responsible to solve that particular ticket.
>>>>>>> 19cdbb1076f3d06b179b2d54f5d842af800afcf8
