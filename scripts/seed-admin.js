const { Admin, initializeDatabase } = require("../lib/sequelize");

async function seedAdmin() {
  try {
    console.log("🌱 Starting admin seeding process...");
    
    // Initialize database
    await initializeDatabase();
    console.log("✅ Database initialized");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      where: { username: "admin" }
    });

    if (existingAdmin) {
      console.log("⚠️  Admin user already exists with username 'admin'");
      console.log("📊 Admin details:", {
        id: existingAdmin.id,
        username: existingAdmin.username,
        email: existingAdmin.email,
        full_name: existingAdmin.full_name,
        is_active: existingAdmin.is_active,
        created_at: existingAdmin.created_at
      });
      return;
    }

    // Create default admin user
    const adminData = {
      username: "admin",
      password: "admin123", // This will be hashed by the model hook
      email: "admin@example.com",
      full_name: "Administrator",
      is_active: true
    };

    const admin = await Admin.create(adminData);
    
    console.log("✅ Default admin user created successfully!");
    console.log("📊 Admin details:", {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      full_name: admin.full_name,
      is_active: admin.is_active,
      created_at: admin.created_at
    });
    
    console.log("🔐 Login credentials:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("");
    console.log("⚠️  IMPORTANT: Change the default password after first login!");

  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedAdmin()
  .then(() => {
    console.log("🎉 Admin seeding completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Admin seeding failed:", error);
    process.exit(1);
  });
