# Admin Authentication System

Sistem autentikasi admin yang aman menggunakan bcrypt untuk enkripsi password dan database PostgreSQL.

## 🚀 Fitur

- **Enkripsi Password**: Menggunakan bcrypt dengan salt rounds 12
- **Database Integration**: Terintegrasi dengan PostgreSQL melalui Sequelize
- **Session Management**: Menggunakan localStorage untuk session management
- **Admin Management**: Model Admin dengan validasi dan hooks
- **API Endpoint**: RESTful API untuk login admin
- **Security**: Password hashing otomatis dan validasi input

## 📋 Struktur Database

### Tabel `admins`

```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  email VARCHAR,
  full_name VARCHAR,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
# Initialize database tables
npm run init-db

# Seed default admin user
npm run seed-admin
```

### 3. Environment Variables

Pastikan file `.env` memiliki konfigurasi database:

```env
DATABASE_URL=postgresql://username:password@host:port/database
```

## 👤 Default Admin User

Setelah menjalankan `npm run seed-admin`, admin default akan dibuat:

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@example.com`
- **Full Name**: `Administrator`

⚠️ **PENTING**: Ganti password default setelah login pertama!

## 🔐 API Endpoints

### POST `/api/admin/login`

Login admin dengan username dan password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Login berhasil",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "username": "Administrator",
    "is_active": true,
    "last_login": "2024-01-01T00:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "Username atau password salah"
}
```

## 🛡️ Security Features

### Password Hashing
- Menggunakan bcrypt dengan salt rounds 12
- Password di-hash otomatis saat create/update
- Password tidak pernah disimpan dalam plain text

### Input Validation
- Username: 3-50 karakter, required
- Password: 6-255 karakter, required
- Email: format email valid (optional)
- Full name: optional

### Session Management
- Admin data disimpan di localStorage
- Logout menghapus semua session data
- Redirect otomatis jika tidak login

## 📝 Model Admin

### Fields
- `id`: UUID primary key
- `username`: Unique username (3-50 chars)
- `password`: Hashed password (6-255 chars)
- `email`: Optional email address
- `is_active`: Boolean status (default: true)
- `last_login`: Timestamp of last login
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Methods
- `validatePassword(password)`: Validasi password
- `toJSON()`: Return data tanpa password

### Hooks
- `beforeCreate`: Hash password sebelum create
- `beforeUpdate`: Hash password jika diubah

## 🔄 Usage

### Login Process
1. User mengisi form login
2. Data dikirim ke `/api/admin/login`
3. Server validasi username dan password
4. Jika valid, update `last_login` dan return admin data
5. Client simpan admin data di localStorage
6. Redirect ke dashboard admin

### Logout Process
1. Hapus `adminLoggedIn` dan `adminData` dari localStorage
2. Clear admin data dari state
3. Redirect ke halaman login

## 🚨 Security Best Practices

1. **Ganti Password Default**: Setelah setup, ganti password admin default
2. **Environment Variables**: Jangan hardcode database credentials
3. **HTTPS**: Gunakan HTTPS di production
4. **Session Timeout**: Implementasi session timeout jika diperlukan
5. **Rate Limiting**: Tambahkan rate limiting untuk login attempts
6. **Audit Log**: Log semua aktivitas admin

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check database connection
npm run init-db
```

### Admin User Issues
```bash
# Re-seed admin user
npm run seed-admin
```

### Login Issues
1. Pastikan database terhubung
2. Check username dan password
3. Pastikan admin user aktif (`is_active: true`)
4. Check browser console untuk error

## 📚 Scripts Available

- `npm run init-db`: Initialize database tables
- `npm run seed-admin`: Create default admin user
- `npm run dev`: Start development server
- `npm run build`: Build for production

## 🔮 Future Enhancements

- [ ] JWT token authentication
- [ ] Role-based access control
- [ ] Password reset functionality
- [ ] Admin user management interface
- [ ] Session timeout
- [ ] Login attempt limiting
- [ ] Two-factor authentication
