
# Mojaloop Bangalore Dashboard

## Overview

This project is a web application for managing bulk payments with Mojaloop. It provides a user-friendly interface for uploading payment files, monitoring their processing, and viewing detailed transaction information. The application is built with Nuxt.js and features a responsive dashboard for a seamless user experience.

## Features

* **Batch Payment Processing:** Upload CSV or XLSX files to initiate bulk payments.
* **Real-time Monitoring:** Track the progress of file uploads and transaction processing in real-time.
* **Transaction Dashboard:** View a detailed list of all transactions with their status (successful, failed, pending).
* **Data Validation:** The system validates each row of the uploaded file to ensure data integrity before sending it to Mojaloop.
* **Error Handling:** Easily identify and export transactions that have failed.
* **Data Export:** Export all transaction data or just the errors to a CSV file.
* **Scheduled Payments:** Schedule recurring monthly payments.
* **Modern UI:** A clean and responsive dashboard built with Nuxt UI.

## Tech Stack

* **Frontend:**
  * [Nuxt.js](https://nuxt.com/) (v4) - A powerful Vue.js framework.
  * [Vue.js](https://vuejs.org/) (v3)
  * [Pinia](https://pinia.vuejs.org/) - State management
  * [Nuxt UI](https://ui.nuxt.com/) - UI components
  * [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
* **Backend:**
  * [Nuxt.js Server Engine](https://nuxt.com/docs/guide/concepts/server-engine)
  * [Sequelize](https://sequelize.org/) - ORM for Node.js
  * [MySQL](https://www.mysql.com/) - Relational database
*   **File Processing:**
  *   [formidable](https://www.npmjs.com/package/formidable) - for parsing form data, especially file uploads.
  *   [csv-parser](https://www.npmjs.com/package/csv-parser) - for parsing CSV files.
  *   [@e965/xlsx](https://www.npmjs.com/package/@e965/xlsx) - for parsing XLSX files.

## Mojaloop Core Integration

The `mojaloop_core` directory contains the necessary configuration to run a local Mojaloop environment using Docker. This setup utilizes the **Mojaloop Testing Toolkit (TTK)** to simulate a live Mojaloop switch, allowing for robust local development and testing.

The Nuxt application acts as a Digital Financial Service Provider (DFSP), sending bulk payment requests to the TTK. The testing environment is pre-configured with the required API definitions and rules, and it includes the **SDK Scheme Adapter**, which facilitates the connection between the DFSP (our application) and the simulated switch.

To start the local Mojaloop TTK environment, run the following command from the `mojaloop_core` directory:
```bash
docker-compose up -d
```

## Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm (or your preferred package manager)
* A running MySQL database instance.

### Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/PrinceSpecial/mojaloopbangalore.git
    cd mojaloopbangalore
    ```

2. **Install dependencies:**
    Navigate to the `app` directory and install the dependencies.

    ```bash
    cd app
    npm install
    ```

3. **Database Setup:**
    * Create a `.env` file in the `app` directory by copying the `.env.example` file.
    * Update the `.env` file with your MySQL database credentials.
    * Run the database migrations:

        ```bash
        npm migrate
        ```

## Usage

1. **Start the development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:3000`.

2. **Build for production:**

    ```bash
    npm run build
    ```

3. **Preview the production build:**

    ```bash
    npm run preview
    ```

## Project Structure

```
mojaloopbangalore/
├── app/
│   ├── app/            # Nuxt frontend (pages, components, etc.)
│   ├── server/         # Nuxt backend (API routes, services)
│   │   ├── api/        # API endpoints
│   │   └── service/    # Business logic (e.g., Mojaloop integration)
│   ├── public/         # Static assets
│   │   └── reports/    # Generated transaction reports
│   ├── nuxt.config.ts  # Nuxt configuration
│   └── package.json    # Project dependencies and scripts
└── mojaloop_core/      # Mojaloop core configuration and spec files
```
