export const DEFAULT_LOGS = [
  {
    activity: 'test entry 4',
    user: 'Admin',
  },];

  export async function seedLogsIfNeeded(LogModel) {
    const count = await LogModel.countDocuments();
    if (count > 3) {
      return;
    }
  
    await LogModel.insertMany(DEFAULT_LOGS);
    console.log(`✓ Seeded ${DEFAULT_LOGS.length} logs`);
    //
    //
  }
