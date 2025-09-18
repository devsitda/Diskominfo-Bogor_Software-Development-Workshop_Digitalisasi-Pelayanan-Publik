const { sequelize } = require("../lib/sequelize");

async function fixNotificationLogs() {
  try {
    console.log("🔧 Fixing notification_logs table...");
    
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Check if created_at column exists and has null values
    const [results] = await sequelize.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notification_logs' 
      AND column_name = 'created_at'
      AND table_schema = 'public'
    `);

    if (results.length === 0) {
      console.log("📝 Adding created_at column to notification_logs...");
      
      // Add created_at column with default value first
      await sequelize.query(`
        ALTER TABLE notification_logs 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `);
      
      // Update existing records to have created_at
      await sequelize.query(`
        UPDATE notification_logs 
        SET created_at = NOW() 
        WHERE created_at IS NULL
      `);
      
      // Now make it NOT NULL
      await sequelize.query(`
        ALTER TABLE notification_logs 
        ALTER COLUMN created_at SET NOT NULL
      `);
      
      console.log("✅ created_at column added successfully");
    } else {
      console.log("📝 created_at column already exists");
      
      // Check if there are null values
      const [nullCount] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM notification_logs 
        WHERE created_at IS NULL
      `);
      
      if (nullCount[0].count > 0) {
        console.log(`🔧 Found ${nullCount[0].count} records with null created_at, fixing...`);
        
        // Update null values
        await sequelize.query(`
          UPDATE notification_logs 
          SET created_at = NOW() 
          WHERE created_at IS NULL
        `);
        
        console.log("✅ Null values fixed");
      } else {
        console.log("✅ No null values found in created_at column");
      }
    }

    // Check if updated_at column exists
    const [updatedAtResults] = await sequelize.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notification_logs' 
      AND column_name = 'updated_at'
      AND table_schema = 'public'
    `);

    if (updatedAtResults.length === 0) {
      console.log("📝 Adding updated_at column to notification_logs...");
      
      // Add updated_at column
      await sequelize.query(`
        ALTER TABLE notification_logs 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `);
      
      console.log("✅ updated_at column added successfully");
    } else {
      console.log("📝 updated_at column already exists");
    }

    console.log("🎉 notification_logs table fixed successfully!");
    
  } catch (error) {
    console.error("❌ Error fixing notification_logs table:", error);
    process.exit(1);
  }
}

// Run the fix
fixNotificationLogs()
  .then(() => {
    console.log("✅ Fix completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fix failed:", error);
    process.exit(1);
  });
