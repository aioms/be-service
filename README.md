# AIOM Backend Services

A modern inventory and order management system backend built with Deno, Hono, and DrizzleORM.

## Introduction

AIOM Backend Services is a robust REST API service designed to handle inventory management, order processing, and supplier relationships. Built with performance and scalability in mind, it leverages the power of Deno runtime and modern TypeScript features.

## Features

- 🚀 **High Performance**: Built on Deno runtime with TypeScript
- 🔐 **Secure Authentication**: JWT-based authentication system
- 📦 **Inventory Management**: Track products, stock levels, and warehouse locations
- 📝 **Receipt Management**: Handle imports, returns, and inventory checks
- 👥 **User Management**: Role-based access control (Supervisor, Admin, User)
- 🏢 **Supplier Management**: Track supplier relationships and transactions
- 🗃️ **PostgreSQL Database**: Reliable data storage with DrizzleORM
- 🔄 **Migration System**: Database versioning with Drizzle Kit

## Prerequisites

- Deno 1.x or higher
- PostgreSQL 14 or higher
- Docker (optional)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/aiom-be-services.git
cd aiom-be-services
```

2. Install dependencies:
```bash
deno task init
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
DENO_ENV=development
PORT=2005
DATABASE_URL=postgres://user:password@localhost:5432/aiom_db
AUTH_JWT_SECRET=your-secret-key
AUTH_API_KEY=your-api-key
```

## Development

Start the development server:
```bash
deno task dev
```

### Database Management

Generate migrations:
```bash
deno task db:generate
```

Apply migrations:
```bash
deno task db:migrate
```

Push schema changes:
```bash
deno task db:push
```

## Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

2. For production deployment:
```bash
./deploy.sh --prod -b -d
```

## Project Structure

```
├── src/
│   ├── common/          # Shared utilities and configurations
│   ├── database/        # Database schemas and migrations
│   ├── modules/         # Feature modules (auth, product, receipt, etc.)
│   └── main.ts         # Application entry point
├── infrastructure/      # Docker and deployment configurations
└── tests/              # Test files
```

## API Documentation

Key endpoints include:

- Authentication: `/auth/login`, `/auth/refresh`
- Products: `/products`, `/products/:id`
- Receipts: `/receipt-check`, `/receipt-import`, `/receipt-return`
- Suppliers: `/suppliers`, `/suppliers/:id`

For detailed API documentation, please refer to our [API Documentation](docs/api.md).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your PR adheres to:
- Consistent code style
- Proper test coverage
- Clear commit messages
- Updated documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please:
- Open an issue on GitHub
- Contact the development team at minhvh.tech@gmail.com
- Join our Telegram community at [AIOM Community](https://t.me/aiom_community)

## Authors

- Minh Moment - Initial work - [@vhm205](https://github.com/vhm205)

## Acknowledgments

- Thanks to the Deno community
- DrizzleORM team for the amazing ORM
- Hono framework contributors
