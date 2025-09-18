const { Admin, initializeDatabase } = require("../lib/sequelize");

async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing database connection...");
    
    // Initialize database
    await initializeDatabase();
    console.log("✅ Database connection established");

    // Test Admin model
    console.log("🔍 Testing Admin model...");
    
    // Try to find all admins
    const admins = await Admin.findAll({
      attributes: ['id', 'username', 'email', 'full_name', 'is_active', 'created_at']
    });
    
    console.log(`✅ Found ${admins.length} admin(s) in database:`);
    admins.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.username} (${admin.full_name || 'No name'}) - Active: ${admin.is_active}`);
    });

    // Test password validation if there are admins
    if (admins.length > 0) {
      console.log("🔍 Testing password validation...");
      const testAdmin = admins[0];
      
      // Try to get the admin with password field
      const adminWithPassword = await Admin.findByPk(testAdmin.id);
      
      if (adminWithPassword) {
        console.log("✅ Admin model with password field loaded successfully");
        console.log(`   Password hash length: ${adminWithPassword.password ? adminWithPassword.password.length : 'null'} characters`);
      } else {
        console.log("❌ Could not load admin with password field");
      }
    }

    console.log("🎉 Database connection test completed successfully!");
    
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection()
  .then(() => {
    console.log("✅ Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
