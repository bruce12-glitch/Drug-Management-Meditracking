# Pharmacy Drug Management System - MediTracking

A web-based pharmacy drug management system built with Java/JSP, MySQL, and Apache Tomcat. This system provides inventory management, order processing, and medication tracking capabilities for pharmacies.

## Features

- **User Authentication**: Login/Register for customers and sellers
- **Inventory Management**: Add, update, and track medicine inventory
- **Order Processing**: Place and manage orders
- **Medication Tracking**: Track medication usage and history
- **Seller Dashboard**: Dedicated interface for pharmacy sellers
- **Multi-language Support**: Internationalization (i18n) ready

## Tech Stack

- **Backend**: Java (JSP/Servlets)
- **Database**: MySQL
- **Build Tool**: Apache Ant
- **Server**: Apache Tomcat
- **Frontend**: HTML, CSS, JavaScript
- **Database Driver**: MySQL Connector/J 5.1.48

## Project Structure

```
Pharmacy-Drug-Mangement/
├── WebContent/                 # Web application files
│   ├── *.jsp                   # JSP pages for all features
│   ├── *.html                  # Static HTML pages
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript files (including i18n)
│   ├── images/                 # Image assets
│   ├── META-INF/               # Web app metadata
│   └── WEB-INF/                # Web app configuration
│       ├── lib/                # JAR dependencies
│       └── security.jsp        # Security configuration
├── nbproject/                  # NetBeans project configuration
├── build.xml                   # Ant build script
└── .gitignore                  # Git ignore rules
```

## Live / local run (recommended)

This sandbox and most hosts can run the app with Node 22 (no Tomcat required). The live server uses the same pages, session rules, and MediTracker tables as the JSP app.

```bash
npm install
npm start
```

Open `http://localhost:8080`. Demo accounts:

- Customer: `demo` / `demo123` then click **MEDITRACKER**
- Vendor: `vendor` / `vendor123`

## Database Setup (Tomcat / MySQL)

SQL scripts now live in `sql/`:

```bash
mysql -u root -p < sql/drugdatabase.sql
mysql -u root -p < sql/meditracker_migration.sql
```

JSP pages connect to `jdbc:mysql://mysql:3306/drugdatabase` (Docker DNS). For a local MySQL, add `127.0.0.1 mysql` to `/etc/hosts`.

## Building the Project

Using Apache Ant:

```bash
ant clean
ant compile
ant war
```

The WAR file will be generated in the `dist/` directory.

## Deployment

1. Deploy the generated WAR file to Apache Tomcat
2. Configure MySQL database connection in `WebContent/META-INF/context.xml`
3. Start Tomcat server
4. Access the application at `http://localhost:8080/Pharmacy-Drug-Mangement`

## Key Pages

- **Index.html** - Landing page
- **Login.jsp / Register.jsp** - Authentication
- **Homepage.jsp** - Customer dashboard
- **SellerHomepage.jsp** - Seller dashboard
- **AddProduct.jsp** - Add new medicines
- **UpdateInventory.jsp** - Manage stock levels
- **Orders.jsp / PlaceOrder.jsp** - Order management
- **TrackerDashboard.jsp** - Medication tracking dashboard
- **TrackerToday.jsp / TrackerHistory.jsp** - Tracking views

## Screenshots

Screenshots are available in the `../Screenshots/` directory.

## License

This project is for educational/demo purposes.