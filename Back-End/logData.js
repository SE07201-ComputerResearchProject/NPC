export const DEFAULT_LOGS = [
  {
    timeStamp: '',
    activity: 'test entry 1',
    user: 'Admin',
  },];

  export async function seedLogsIfNeeded(LogModel) {
    const count = await LogModel.countDocuments();
    if (count > 0) {
      return;
    }
  
    await LogModel.insertMany(DEFAULT_LOGS);
    console.log(`✓ Seeded ${DEFAULT_LOGS.length} logs`);
  }