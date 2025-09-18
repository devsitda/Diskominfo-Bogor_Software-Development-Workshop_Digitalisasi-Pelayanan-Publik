import { NextResponse } from "next/server";
import { Admin, initializeDatabase } from "@/lib/sequelize";

// Initialize database on first request
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
};

export async function POST(request) {
  try {
    await initDB();

    const body = await request.json();
    const { username, password } = body;

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { 
          success: false,
          message: "Username dan password wajib diisi" 
        },
        { status: 400 }
      );
    }

    // Find admin by username
    const admin = await Admin.findOne({
      where: { 
        username: username.trim(),
      },
      attributes: ['id', 'username', 'password', 'email']
    });

    if (!admin) {
      return NextResponse.json(
        { 
          success: false,
          message: "Username atau password salah" 
        },
        { status: 401 }
      );
    }

    // Validate password
    const isValidPassword = await admin.validatePassword(password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false,
          message: "Username atau password salah" 
        },
        { status: 401 }
      );
    }

    // Optionally: update something lightweight if needed (skip last_login since column not present)

    // Return admin data (password excluded by toJSON method)
    const adminData = admin.toJSON();

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      admin: adminData
    });

  } catch (error) {
    console.error("Admin login error:", error);
    
    return NextResponse.json(
      { 
        success: false,
        message: "Terjadi kesalahan internal server" 
      },
      { status: 500 }
    );
  }
}
